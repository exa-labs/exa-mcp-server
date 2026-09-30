import type { AgentEvent, AgentRun, CreateAgentRunParams } from "exa-js";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerNotification, ServerRequest } from "@modelcontextprotocol/sdk/types.js";
import type { McpAnalytics } from "../analytics.js";
import type { AgentEffort, AgentRunInput, ToolContent } from "../types.js";
import { formatAgentToolError } from "../utils/agentErrorHandler.js";
import { delay } from "../utils/errorHandler.js";
import { createRequestLogger } from "../utils/logger.js";
import { structuredContent } from "../utils/response.js";
import {
  AgentProgressBridge,
  DEFAULT_PROGRESS_THROTTLE_MS,
  heartbeatMessage,
  type AgentProgressState,
} from "./agentProgress.js";
import { createExaClient } from "./config.js";

const effortSchema = z.enum(["minimal", "low", "medium", "high", "xhigh", "ultra", "auto"]);
const recordSchema = () => z.record(z.unknown());

const agentRunIdSchema = () =>
  z.string().regex(/^agent_run_/, { message: 'Must start with "agent_run_"' });
const dataSourceProviderSchema = z.enum([
  "fiber",
  "financial_datasets",
  "similarweb",
  "baselayer",
  "affiliate",
  "particle",
  "jinko",
  "polymarket",
  "macrobond",
]);

/**
 * Tool description shown to the client model. The cheaper alternatives are named only
 * when registered in the same session, so an agent-only `?tools=agent_run` server never
 * points the model at tools it cannot call.
 */
export function buildAgentRunDescription(siblingTools: Iterable<string> = []): string {
  const registered = new Set(siblingTools);
  const searchTools = ["web_search_exa", "web_search_advanced_exa"].filter((t) =>
    registered.has(t),
  );
  const searchAlt = searchTools.length > 0 ? ` (use ${searchTools.join(" or ")})` : "";
  const fetchAlt = registered.has("web_fetch_exa") ? " (use web_fetch_exa)" : "";
  return `Start or resume an Exa Agent run for multi-step research, list-building, or enrichment. Use it instead of running many searches yourself when a task needs multiple searches, cross-source verification, or a structured table of results. Long-running: returns a run ID; resume with runId when the tool reports the run is still running. Not for a single question or lookup${searchAlt} or reading a known URL${fetchAlt}. An interrupted tool call is not an explicit cancellation request.`;
}

export const agentRunInputShape = {
  query: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Natural-language research or enrichment objective. Provide query or runId, not both.",
    ),
  runId: agentRunIdSchema()
    .optional()
    .describe(
      "agent_run_... ID returned by an earlier call. Use it to check or continue waiting for the same run; do not start a duplicate run.",
    ),
  systemPrompt: z.string().optional().describe("Optional system-level guidance for the Agent."),
  outputSchema: recordSchema()
    .optional()
    .describe(
      "Optional JSON Schema for output. Prefer a top-level object with bounded arrays and source/evidence fields.",
    ),
  input: z
    .object({
      data: z
        .array(recordSchema())
        .optional()
        .describe("Known rows/entities to enrich or process."),
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
  previousRunId: agentRunIdSchema()
    .optional()
    .describe("Completed prior agent_run_... ID to use as context for a new run."),
  effort: effortSchema
    .optional()
    .describe("Agent effort: minimal, low, medium, high, xhigh, ultra, or auto. Defaults to low."),
};

/**
 * `string | null` that serializes as `anyOf: [{type: "string"}, {type: "null"}]`.
 * zod-to-json-schema collapses unions of check-free primitives into
 * `type: ["string", "null"]`, which several MCP clients misread as a single
 * type; the no-op `minLength: 0` keeps the branches separate.
 */
function nullableString(description: string) {
  return z.union([z.string().min(0), z.null()]).describe(description);
}

/**
 * MCP `outputSchema` for agent_run (distinct from the Agent API `outputSchema`
 * request field above). One flat object covers every reportable status rather
 * than a per-status `oneOf`, because some clients validate `structuredContent`
 * even on `isError` results and not all JSON Schema validators handle
 * discriminators. Field names and semantics follow the Agent API run object;
 * `output.structured` and `output.grounding` stay loose because they vary per
 * run and per caller-supplied schema.
 */
export const agentRunOutputShape = {
  success: z
    .boolean()
    .describe("True for completed and running runs; false for failed and cancelled."),
  id: z.string().describe("agent_run_... ID. Pass as runId to resume a running run."),
  status: z.enum(["completed", "running", "failed", "cancelled"]),
  outputReady: z.boolean().describe("True only when status is completed."),
  output: z
    .object({
      text: nullableString("Prose answer.").optional(),
      structured: z.unknown().describe("Output matching the caller-supplied outputSchema, if any."),
      grounding: z.unknown().describe("Per-field citations and confidence."),
    })
    .passthrough()
    .nullable()
    .optional(),
  stopReason: nullableString(
    "Why the run stopped: schema_satisfied, budget_reached, time_limit_reached, stopped, error, or cancelled.",
  ).optional(),
  usage: z.record(z.unknown()).optional(),
  costDollars: z.record(z.unknown()).optional(),
  error: z.record(z.unknown()).optional(),
  message: z.string().optional().describe("Next-step guidance for running runs."),
};

const agentRunOutputSchema = z.object(agentRunOutputShape);

// Default MCP function duration (seconds) and the headroom kept before the platform
// kills the invocation; together they cap the call window, which otherwise defaults
// to DEFAULT_CALL_WINDOW_MS so the run ID comes back before clients time out.
export const DEFAULT_MCP_MAX_DURATION_SECONDS = 800;
export const CALL_WINDOW_HEADROOM_MS = 50_000;
export const DEFAULT_CALL_WINDOW_MS = 45_000;
export const DEFAULT_HEARTBEAT_MS = 15_000;
export const DEFAULT_POLL_INTERVAL_MS = 4_000;
export const DEFAULT_PROGRESS_TIMEOUT_MS = 2_000;

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
      : DEFAULT_MCP_MAX_DURATION_SECONDS * 1000 - CALL_WINDOW_HEADROOM_MS;

  if (
    options?.agentCallWindowMs != null &&
    Number.isFinite(options.agentCallWindowMs) &&
    options.agentCallWindowMs > 0
  ) {
    return Math.min(Math.trunc(options.agentCallWindowMs), ceiling);
  }

  return Math.min(DEFAULT_CALL_WINDOW_MS, ceiling);
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
};

function createInterrupt(
  signal: AbortSignal | undefined,
  windowMs: number,
): {
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
  progressThrottleMs?: number;
  progressTimeoutMs?: number;
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
  let iterator: AsyncIterator<AgentEvent> | undefined;
  const progressBridge = new AgentProgressBridge({
    emit: emitProgress,
    throttleMs: params.progressThrottleMs ?? DEFAULT_PROGRESS_THROTTLE_MS,
  });

  const heartbeatTimer = setInterval(
    () => {
      const state: AgentProgressState = progressBridge.getState();
      if (Date.now() - state.lastMeaningfulAt < heartbeatMs) return;
      void emitProgress(heartbeatMessage(state));
    },
    Math.max(heartbeatMs, 1),
  );

  const cleanup = async (): Promise<void> => {
    interrupt.cleanup();
    clearInterval(heartbeatTimer);
    await progressBridge.cleanup();
    void iterator?.return?.(undefined).catch(() => {});
  };

  const finish = async (
    status: RunOutcomeStatus,
    handoffReason?: HandoffReason,
  ): Promise<RunOutcome> => {
    await cleanup();
    const resultStatus = status === "client_aborted" && runId != null ? "running" : status;

    return {
      status: resultStatus,
      terminalEvent,
      run: null,
      eventCount,
      runId,
      ...(handoffReason != null ? { handoffReason } : {}),
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
        return finish(runId == null ? "unrecoverable_stream" : "running", "stream_window_exceeded");
      }
      if (next.value.done) {
        return finish(runId == null ? "unrecoverable_stream" : "running", "stream_interrupted");
      }

      const event = next.value.value;
      eventCount += 1;

      if (runId == null) {
        const eventData =
          typeof event.data === "object" && event.data !== null && !Array.isArray(event.data)
            ? (event.data as Record<string, unknown>)
            : undefined;
        const eventRunId = eventData?.id;
        if (typeof eventRunId === "string") runId = eventRunId;
      }

      await progressBridge.handle(event);

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
    await cleanup();
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

  const finish = async (
    status: RunOutcomeStatus,
    handoffReason?: HandoffReason,
  ): Promise<RunOutcome> => {
    interrupt.cleanup();
    return {
      status,
      terminalEvent: null,
      run,
      eventCount: updateCount,
      runId: params.runId,
      ...(handoffReason != null ? { handoffReason } : {}),
    };
  };

  if (params.signal?.aborted) return finish("running");

  try {
    while (true) {
      const fetched = await raceWithInterrupt(
        params.client.getRun(params.runId),
        interrupt.promise,
      );
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

/**
 * Validate an outgoing payload against the declared MCP output schema before it
 * leaves the server. A mismatch means the upstream run shape drifted from the
 * Agent API contract; surface it as an error rather than emit `structuredContent`
 * that clients will reject.
 */
function agentRunResult(payload: Record<string, unknown>): ToolContent {
  const parsed = agentRunOutputSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(
      `agent_run result for ${String(payload.id)} did not match the declared output schema: ${parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ")}`,
    );
  }
  return structuredContent(parsed.data);
}

function validRunId(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function missingRunIdResult(status: "completed" | "cancelled" | "failed" | "running"): ToolContent {
  return {
    content: [
      {
        type: "text",
        text: `agent_run error: the upstream run reported status=${status} without a run ID, so the result cannot be resumed or referenced.`,
      },
    ],
    isError: true,
  };
}

function outcomeToToolContent(outcome: RunOutcome): ToolContent {
  const run = outcomePayload(outcome);
  const id = validRunId(run.id) ?? validRunId(outcome.runId);
  const stopReason = run.stopReason != null ? { stopReason: run.stopReason } : {};

  switch (outcome.status) {
    case "completed":
      if (id == null) return missingRunIdResult(outcome.status);
      return agentRunResult({
        success: true,
        id,
        status: "completed",
        outputReady: true,
        output: run.output ?? null,
        ...stopReason,
        ...(run.usage != null ? { usage: run.usage } : {}),
        ...(run.costDollars != null ? { costDollars: run.costDollars } : {}),
      });
    case "cancelled":
      if (id == null) return missingRunIdResult(outcome.status);
      return agentRunResult({
        success: false,
        id,
        status: "cancelled",
        outputReady: false,
        ...stopReason,
      });
    case "failed": {
      if (id == null) return missingRunIdResult(outcome.status);
      const result = agentRunResult({
        success: false,
        id,
        status: "failed",
        outputReady: false,
        ...stopReason,
        ...(run.error != null ? { error: run.error } : {}),
      });
      return {
        ...result,
        content: [
          ...result.content,
          {
            type: "text",
            text: "The Agent run failed. Inspect the error above and verify any outputSchema before retrying.",
          },
        ],
        isError: true,
      };
    }
    case "running":
      if (id == null) return missingRunIdResult(outcome.status);
      return agentRunResult({
        success: true,
        id,
        status: "running",
        outputReady: false,
        message: `The Agent run is still active. Call agent_run again with runId=${id} to continue waiting; do not create a replacement run or cancel it unless the user explicitly requests cancellation.`,
      });
    case "client_aborted": {
      return {
        content: [
          {
            type: "text",
            text: "agent_run was interrupted before a run ID was received, so the upstream run could not be safely resumed.",
          },
        ],
        isError: true,
      };
    }
    case "unrecoverable_stream":
      return {
        content: [
          {
            type: "text",
            text: "agent_run error: the live stream ended before a run ID or terminal result was received. Upstream state is unknown, so retrying may start a duplicate run.",
          },
        ],
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
  analytics?: McpAnalytics;
};

export type AgentRunToolOptions = {
  callWindowMs?: number;
  heartbeatMs?: number;
  progressThrottleMs?: number;
  pollIntervalMs?: number;
  progressTimeoutMs?: number;
  clientFactory?: (config: AgentRunConfig | undefined) => AgentRunClient;
  siblingTools?: Iterable<string>;
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
  server.registerTool(
    "agent_run",
    {
      description: buildAgentRunDescription(options?.siblingTools),
      inputSchema: agentRunInputShape,
      outputSchema: agentRunOutputShape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
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
          throw new Error(
            "A runId resume call accepts only runId; create options apply only to a new query.",
          );
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
          config?.analytics?.checkpoint?.("agent_run_resume", { mode: "retained" });
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
            // Under non-strict compilation zod infers `provider` as
            // optional; normalize so both modes typecheck.
            ...(dataSources != null
              ? {
                  dataSources: dataSources.flatMap(({ provider }) =>
                    provider != null ? [{ provider }] : [],
                  ),
                }
              : {}),
            ...(previousRunId != null ? { previousRunId } : {}),
            effort: (effort ?? "low") as AgentEffort,
          };

          config?.analytics?.checkpoint?.("agent_run_request_prepared", {
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
            progressThrottleMs: options?.progressThrottleMs,
            progressTimeoutMs: options?.progressTimeoutMs,
          });
        }

        config?.analytics?.checkpoint?.("agent_run_finished", {
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
