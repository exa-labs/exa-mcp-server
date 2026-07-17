import type { AgentEvent, AgentRun, CreateAgentRunParams } from "exa-js";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerNotification, ServerRequest } from "@modelcontextprotocol/sdk/types.js";
import { checkpoint } from "agnost";
import type { AgentEffort, AgentRunInput, ToolContent } from "../types.js";
import { formatAgentToolError } from "../utils/agentErrorHandler.js";
import { delay } from "../utils/errorHandler.js";
import { createRequestLogger } from "../utils/logger.js";
import { jsonContent } from "../utils/response.js";
import { createExaClient } from "./config.js";

const effortSchema = z.enum(["minimal", "low", "medium", "high", "xhigh", "auto"]);
const recordSchema = () => z.record(z.unknown());
const dataSourceProviderSchema = z.enum([
  "fiber",
  "financial_datasets",
  "similarweb",
  "baselayer",
  "affiliate",
  "particle",
  "jinko",
]);

export const agentRunInputShape = {
  query: z
    .string()
    .min(1)
    .optional()
    .describe("Natural-language research or enrichment objective. Provide query or runId, not both."),
  runId: z
    .string()
    .startsWith("agent_run_")
    .optional()
    .describe("Retained agent_run_... ID returned by an earlier call. Waits for that run to finish."),
  systemPrompt: z.string().optional().describe("Optional system-level guidance for the Agent."),
  outputSchema: recordSchema()
    .optional()
    .describe(
      "Optional JSON Schema for output. Prefer a top-level object with bounded arrays and source/evidence fields.",
    ),
  input: z
    .object({
      data: z.array(recordSchema()).optional().describe("Known rows/entities to enrich or process."),
      exclusion: z
        .array(recordSchema())
        .optional()
        .describe("Entities, rows, or records Agent should avoid returning again."),
    })
    .optional(),
  dataSources: z
    .array(z.object({ provider: dataSourceProviderSchema }))
    .max(5)
    .optional()
    .describe("Optional Exa Connect providers to enable for this run."),
  previousRunId: z
    .string()
    .startsWith("agent_run_")
    .optional()
    .describe("Completed prior agent_run_... ID to use as context for a new run."),
  effort: effortSchema
    .optional()
    .describe("Agent effort: minimal, low, medium, high, xhigh, or auto. Defaults to low."),
};

// Default MCP function duration (seconds) and headroom before the platform kills
// the invocation. The call window is derived from these unless overridden.
export const DEFAULT_MCP_MAX_DURATION_SECONDS = 800;
export const CALL_WINDOW_HEADROOM_MS = 50_000;
export const DEFAULT_CALL_WINDOW_MS =
  DEFAULT_MCP_MAX_DURATION_SECONDS * 1000 - CALL_WINDOW_HEADROOM_MS;
export const DEFAULT_HEARTBEAT_MS = 15_000;
export const DEFAULT_POLL_INTERVAL_MS = 4_000;
export const DEFAULT_PROGRESS_TIMEOUT_MS = 2_000;
export const DEFAULT_CANCEL_TIMEOUT_MS = 5_000;

export function parsePositiveInteger(value: string | undefined): number | undefined {
  if (value == null || value.trim() === "") return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function resolveAgentCallWindowMs(options?: {
  agentCallWindowMs?: number;
  mcpMaxDurationSeconds?: number;
}): number {
  const maxDurationSeconds = options?.mcpMaxDurationSeconds ?? DEFAULT_MCP_MAX_DURATION_SECONDS;
  const ceiling =
    Number.isFinite(maxDurationSeconds) && maxDurationSeconds > 0
      ? Math.max(1, maxDurationSeconds * 1000 - CALL_WINDOW_HEADROOM_MS)
      : DEFAULT_CALL_WINDOW_MS;

  if (
    options?.agentCallWindowMs != null &&
    Number.isFinite(options.agentCallWindowMs) &&
    options.agentCallWindowMs > 0
  ) {
    return Math.min(Math.trunc(options.agentCallWindowMs), ceiling);
  }

  return ceiling;
}

const TERMINAL_EVENTS = new Map<string, "completed" | "failed" | "cancelled">([
  ["agent_run.completed", "completed"],
  ["agent_run.failed", "failed"],
  ["agent_run.cancelled", "cancelled"],
]);

const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);

export type AgentRunClient = {
  createStream: (runInput: AgentRunInput) => Promise<AsyncIterable<AgentEvent>>;
  getRun: (runId: string) => Promise<AgentRun>;
  cancelRun: (runId: string) => Promise<unknown>;
};

type Interrupt = "client_aborted" | "window_exceeded";
type HandoffReason = "stream_window_exceeded" | "stream_interrupted" | "poll_window_exceeded";
type RunOutcomeStatus =
  | "completed"
  | "failed"
  | "cancelled"
  | "running"
  | "client_aborted"
  | "unrecoverable_stream";

export type RunOutcome = {
  status: RunOutcomeStatus;
  terminalEvent: AgentEvent | null;
  run: AgentRun | null;
  eventCount: number;
  runId: string | null;
  handoffReason?: HandoffReason;
  runCancelAttempted: boolean;
  runCancelSucceeded: boolean;
};

function createInterrupt(signal: AbortSignal | undefined, windowMs: number): {
  promise: Promise<Interrupt>;
  cleanup: () => void;
} {
  let settled = false;
  let resolveInterrupt: (reason: Interrupt) => void = () => {};
  const promise = new Promise<Interrupt>((resolve) => {
    resolveInterrupt = (reason) => {
      if (settled) return;
      settled = true;
      resolve(reason);
    };
  });

  const onAbort = () => resolveInterrupt("client_aborted");
  const timer = setTimeout(() => resolveInterrupt("window_exceeded"), Math.max(windowMs, 1));

  if (signal?.aborted) {
    resolveInterrupt("client_aborted");
  } else {
    signal?.addEventListener("abort", onAbort, { once: true });
  }

  return {
    promise,
    cleanup: () => {
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    },
  };
}

async function raceWithInterrupt<T>(
  operation: Promise<T>,
  interrupted: Promise<Interrupt>,
): Promise<{ kind: "value"; value: T } | { kind: "interrupt"; reason: Interrupt }> {
  return Promise.race([
    operation.then((value) => ({ kind: "value" as const, value })),
    interrupted.then((reason) => ({ kind: "interrupt" as const, reason })),
  ]);
}

async function completesWithin(
  operation: () => void | Promise<unknown>,
  timeoutMs: number,
): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      Promise.resolve().then(operation),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("operation timed out")), Math.max(timeoutMs, 1));
      }),
    ]);
    return true;
  } catch {
    return false;
  } finally {
    if (timer != null) clearTimeout(timer);
  }
}

async function cancelKnownRun(
  client: AgentRunClient,
  runId: string | null,
  timeoutMs: number,
): Promise<{ attempted: boolean; succeeded: boolean }> {
  if (runId == null) return { attempted: false, succeeded: false };
  return {
    attempted: true,
    succeeded: await completesWithin(() => client.cancelRun(runId), timeoutMs),
  };
}

function createProgressEmitter(
  onProgress: ((progress: number, message: string) => void | Promise<void>) | undefined,
  timeoutMs: number,
): (message: string) => Promise<void> {
  let progress = 0;
  let busy = false;
  let disabled = false;

  return async (message: string): Promise<void> => {
    if (onProgress == null || disabled || busy) return;
    busy = true;
    progress += 1;
    try {
      const delivered = await completesWithin(() => onProgress(progress, message), timeoutMs);
      if (!delivered) disabled = true;
    } finally {
      busy = false;
    }
  };
}

export function formatProgressMessage(event: AgentEvent, runId: string | null): string {
  const parts: string[] = [event.event];
  if (event.event === "agent_run.created" && runId != null) parts.push(runId);

  for (const key of ["status", "title", "step", "url"]) {
    const value = event.data?.[key];
    if (typeof value === "string" && value.length > 0) {
      parts.push(value.slice(0, 120));
      break;
    }
  }

  return parts.join(" — ").slice(0, 200);
}

export async function streamAgentRun(params: {
  client: AgentRunClient;
  runInput: AgentRunInput;
  onProgress?: (progress: number, message: string) => void | Promise<void>;
  signal?: AbortSignal;
  callWindowMs?: number;
  heartbeatMs?: number;
  progressTimeoutMs?: number;
  cancelTimeoutMs?: number;
}): Promise<RunOutcome> {
  const callWindowMs = params.callWindowMs ?? DEFAULT_CALL_WINDOW_MS;
  const heartbeatMs = params.heartbeatMs ?? DEFAULT_HEARTBEAT_MS;
  const emitProgress = createProgressEmitter(
    params.onProgress,
    params.progressTimeoutMs ?? DEFAULT_PROGRESS_TIMEOUT_MS,
  );
  const interrupt = createInterrupt(params.signal, callWindowMs);

  let eventCount = 0;
  let runId: string | null = null;
  let terminalEvent: AgentEvent | null = null;
  let lastActivityAt = Date.now();
  let iterator: AsyncIterator<AgentEvent> | undefined;

  const heartbeatTimer = setInterval(() => {
    if (Date.now() - lastActivityAt < heartbeatMs) return;
    lastActivityAt = Date.now();
    void emitProgress(`waiting: run ${runId ?? "pending"} in progress (${eventCount} events so far)`);
  }, Math.max(heartbeatMs, 1));

  const cleanup = (): void => {
    interrupt.cleanup();
    clearInterval(heartbeatTimer);
    void iterator?.return?.(undefined).catch(() => {});
  };

  const finish = async (
    status: RunOutcomeStatus,
    handoffReason?: HandoffReason,
  ): Promise<RunOutcome> => {
    cleanup();
    const cancellation =
      status === "client_aborted"
        ? await cancelKnownRun(
            params.client,
            runId,
            params.cancelTimeoutMs ?? DEFAULT_CANCEL_TIMEOUT_MS,
          )
        : { attempted: false, succeeded: false };

    return {
      status,
      terminalEvent,
      run: null,
      eventCount,
      runId,
      ...(handoffReason != null ? { handoffReason } : {}),
      runCancelAttempted: cancellation.attempted,
      runCancelSucceeded: cancellation.succeeded,
    };
  };

  if (params.signal?.aborted) return finish("client_aborted");

  try {
    const streamPromise = params.client.createStream(params.runInput);
    const created = await raceWithInterrupt(streamPromise, interrupt.promise);

    if (created.kind === "interrupt") {
      void streamPromise
        .then((events) => void events[Symbol.asyncIterator]().return?.(undefined))
        .catch(() => {});
      if (created.reason === "client_aborted") return finish("client_aborted");
      return finish("unrecoverable_stream", "stream_window_exceeded");
    }

    iterator = created.value[Symbol.asyncIterator]();
    while (true) {
      const next = await raceWithInterrupt(iterator.next(), interrupt.promise);
      if (next.kind === "interrupt") {
        if (next.reason === "client_aborted") return finish("client_aborted");
        return finish(
          runId == null ? "unrecoverable_stream" : "running",
          "stream_window_exceeded",
        );
      }
      if (next.value.done) {
        return finish(runId == null ? "unrecoverable_stream" : "running", "stream_interrupted");
      }

      const event = next.value.value;
      eventCount += 1;
      lastActivityAt = Date.now();

      if (runId == null) {
        const eventRunId = event.data?.id;
        if (typeof eventRunId === "string") runId = eventRunId;
      }

      await emitProgress(formatProgressMessage(event, runId));

      const terminalStatus = TERMINAL_EVENTS.get(event.event);
      if (terminalStatus != null) {
        terminalEvent = event;
        return finish(terminalStatus);
      }
    }
  } catch (error) {
    if (params.signal?.aborted) return finish("client_aborted");
    if (runId != null) return finish("running", "stream_interrupted");
    if (iterator != null) return finish("unrecoverable_stream", "stream_interrupted");
    cleanup();
    throw error;
  }
}

export async function pollAgentRun(params: {
  client: AgentRunClient;
  runId: string;
  onProgress?: (progress: number, message: string) => void | Promise<void>;
  signal?: AbortSignal;
  callWindowMs?: number;
  pollIntervalMs?: number;
  progressTimeoutMs?: number;
}): Promise<RunOutcome> {
  const interrupt = createInterrupt(params.signal, params.callWindowMs ?? DEFAULT_CALL_WINDOW_MS);
  const emitProgress = createProgressEmitter(
    params.onProgress,
    params.progressTimeoutMs ?? DEFAULT_PROGRESS_TIMEOUT_MS,
  );
  let run: AgentRun | null = null;
  let updateCount = 0;

  const finish = async (status: RunOutcomeStatus, handoffReason?: HandoffReason): Promise<RunOutcome> => {
    interrupt.cleanup();
    return {
      status,
      terminalEvent: null,
      run,
      eventCount: updateCount,
      runId: params.runId,
      ...(handoffReason != null ? { handoffReason } : {}),
      runCancelAttempted: false,
      runCancelSucceeded: false,
    };
  };

  if (params.signal?.aborted) return finish("running");

  try {
    while (true) {
      const fetched = await raceWithInterrupt(params.client.getRun(params.runId), interrupt.promise);
      if (fetched.kind === "interrupt") {
        return finish(
          "running",
          fetched.reason === "window_exceeded" ? "poll_window_exceeded" : undefined,
        );
      }

      run = fetched.value;
      updateCount += 1;
      await emitProgress(`waiting: run ${params.runId} status=${run.status}`);

      if (TERMINAL_STATUSES.has(run.status)) {
        return finish(run.status as "completed" | "failed" | "cancelled");
      }

      const waited = await raceWithInterrupt(
        delay(params.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS),
        interrupt.promise,
      );
      if (waited.kind === "interrupt") {
        return finish(
          "running",
          waited.reason === "window_exceeded" ? "poll_window_exceeded" : undefined,
        );
      }
    }
  } catch (error) {
    if (params.signal?.aborted) return finish("running");
    interrupt.cleanup();
    throw error;
  }
}

function outcomePayload(outcome: RunOutcome): Record<string, unknown> {
  if (outcome.run != null) return outcome.run as unknown as Record<string, unknown>;
  return outcome.terminalEvent?.data ?? {};
}

function outcomeToToolContent(outcome: RunOutcome): ToolContent {
  const run = outcomePayload(outcome);
  const id = typeof run.id === "string" ? run.id : outcome.runId;

  switch (outcome.status) {
    case "completed":
      return jsonContent({
        success: true,
        id,
        status: "completed",
        outputReady: true,
        output: run.output ?? null,
        ...(run.usage != null ? { usage: run.usage } : {}),
        ...(run.costDollars != null ? { costDollars: run.costDollars } : {}),
      });
    case "cancelled":
      return jsonContent({ success: false, id, status: "cancelled", outputReady: false });
    case "failed":
      return {
        content: [
          ...jsonContent({
            success: false,
            id,
            status: "failed",
            outputReady: false,
            ...(run.error != null ? { error: run.error } : {}),
          }).content,
          {
            type: "text",
            text: "The Agent run failed. Inspect the error above and verify any outputSchema before retrying.",
          },
        ],
        isError: true,
      };
    case "running":
      return jsonContent({
        success: true,
        id,
        status: "running",
        outputReady: false,
        message: `The run is still in progress. Call agent_run again with runId=${id} to continue waiting.`,
      });
    case "client_aborted": {
      const cancelMessage = outcome.runCancelAttempted
        ? outcome.runCancelSucceeded
          ? `Run ${id} was cancelled upstream.`
          : `Run ${id} could not be cancelled and may still be executing.`
        : "No run ID was received, so the upstream run could not be cancelled.";
      return {
        content: [{ type: "text", text: `agent_run cancelled by the client. ${cancelMessage}` }],
        isError: true,
      };
    }
    case "unrecoverable_stream":
      return {
        content: [{
          type: "text",
          text: "agent_run error: the live stream ended before a run ID or terminal result was received. Upstream state is unknown, so retrying may start a duplicate run.",
        }],
        isError: true,
      };
  }
}

type StreamToolExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;

export type AgentRunConfig = {
  exaApiKey?: string;
  oauthAccessToken?: string;
  exaSource?: string;
  mcpSessionId?: string;
  mcpClient?: unknown;
};

export type AgentRunToolOptions = {
  callWindowMs?: number;
  heartbeatMs?: number;
  pollIntervalMs?: number;
  progressTimeoutMs?: number;
  cancelTimeoutMs?: number;
  clientFactory?: (config: AgentRunConfig | undefined) => AgentRunClient;
};

function defaultClientFactory(config: AgentRunConfig | undefined): AgentRunClient {
  const client = createExaClient(config, "agent-mcp");
  return {
    createStream: (runInput) =>
      client.agent.runs.create({ ...(runInput as CreateAgentRunParams), stream: true }),
    getRun: (runId) => client.agent.runs.get(runId),
    cancelRun: (runId) => client.agent.runs.cancel(runId),
  };
}

export function registerAgentRunTool(
  server: McpServer,
  config?: AgentRunConfig,
  options?: AgentRunToolOptions,
): void {
  server.tool(
    "agent_run",
    "Run an Exa Agent with live progress. New runs always stream. If a run outlives one call window, the tool returns its ID; call agent_run again with runId to keep waiting. Effort defaults to low.",
    agentRunInputShape,
    { readOnlyHint: true, destructiveHint: false, idempotentHint: false },
    async (
      { query, runId, systemPrompt, outputSchema, input, dataSources, previousRunId, effort },
      extra: StreamToolExtra,
    ): Promise<ToolContent> => {
      const logger = createRequestLogger("agent_run");
      logger.start(runId != null ? "resume request" : "streaming request");

      try {
        const hasApiKey = typeof config?.exaApiKey === "string" && config.exaApiKey.length > 0;
        const hasOAuthToken =
          typeof config?.oauthAccessToken === "string" && config.oauthAccessToken.length > 0;
        if (!hasApiKey && !hasOAuthToken) {
          throw new Error(
            "Agent tools require user authentication. Provide an Exa API key or OAuth access token.",
          );
        }

        if ((query == null) === (runId == null)) {
          throw new Error("Provide exactly one of query or runId.");
        }

        if (
          runId != null &&
          [systemPrompt, outputSchema, input, dataSources, previousRunId, effort].some(
            (value) => value != null,
          )
        ) {
          throw new Error("A runId resume call accepts only runId; create options apply only to a new query.");
        }

        const client = (options?.clientFactory ?? defaultClientFactory)(config);
        const progressToken = extra?._meta?.progressToken;
        let progressBroken = false;
        const onProgress =
          progressToken == null
            ? undefined
            : async (progress: number, message: string): Promise<void> => {
                if (progressBroken) return;
                try {
                  await extra.sendNotification({
                    method: "notifications/progress",
                    params: { progressToken, progress, message },
                  });
                } catch (error) {
                  progressBroken = true;
                  logger.error(error);
                }
              };

        let outcome: RunOutcome;
        if (runId != null) {
          checkpoint("agent_run_resume", { mode: "retained" });
          outcome = await pollAgentRun({
            client,
            runId,
            onProgress,
            signal: extra?.signal,
            callWindowMs: options?.callWindowMs,
            pollIntervalMs: options?.pollIntervalMs,
            progressTimeoutMs: options?.progressTimeoutMs,
          });
        } else {
          const runInput: AgentRunInput = {
            query: query as string,
            ...(systemPrompt != null ? { systemPrompt } : {}),
            ...(outputSchema != null ? { outputSchema } : {}),
            ...(input != null ? { input } : {}),
            ...(dataSources != null ? { dataSources } : {}),
            ...(previousRunId != null ? { previousRunId } : {}),
            effort: (effort ?? "low") as AgentEffort,
          };

          checkpoint("agent_run_request_prepared", {
            hasSchema: outputSchema != null,
            hasInputData: input?.data != null,
            hasDataSources: dataSources != null,
            hasPreviousRunId: previousRunId != null,
            effort: runInput.effort,
          });

          outcome = await streamAgentRun({
            client,
            runInput,
            onProgress,
            signal: extra?.signal,
            callWindowMs: options?.callWindowMs,
            heartbeatMs: options?.heartbeatMs,
            progressTimeoutMs: options?.progressTimeoutMs,
            cancelTimeoutMs: options?.cancelTimeoutMs,
          });
        }

        checkpoint("agent_run_finished", {
          eventCount: outcome.eventCount,
          status: outcome.status,
          terminalEvent: outcome.terminalEvent?.event ?? "none",
        });

        logger.complete();
        return outcomeToToolContent(outcome);
      } catch (error) {
        logger.error(error);
        return formatAgentToolError(error, "agent_run");
      }
    },
  );
}
