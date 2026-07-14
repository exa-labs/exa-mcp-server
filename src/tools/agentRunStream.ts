import type { AgentEvent, CreateAgentRunParams } from "exa-js";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerNotification, ServerRequest } from "@modelcontextprotocol/sdk/types.js";
import { checkpoint } from "agnost";
import type { AgentEffort, AgentRunInput, ToolContent } from "../types.js";
import { createExaClient } from "./config.js";
import { formatAgentToolError } from "../utils/agentErrorHandler.js";
import { type AgentToolConfig } from "../utils/agentTool.js";
import { createRequestLogger } from "../utils/logger.js";
import { jsonContent } from "../utils/response.js";

const effortSchema = z.enum(["minimal", "low", "medium", "high", "xhigh", "auto"]);
const recordSchema = z.record(z.unknown());

export const agentRunStreamInputShape = {
  query: z.string().min(1).describe("Natural-language research or enrichment objective."),
  systemPrompt: z.string().optional().describe("Optional system-level guidance for the Agent."),
  outputSchema: recordSchema
    .optional()
    .describe(
      "Optional JSON Schema for output. Prefer a top-level object with bounded arrays and source/evidence fields.",
    ),
  input: z
    .object({
      data: z.array(recordSchema).optional().describe("Known rows/entities to enrich or process."),
      exclusion: z
        .array(recordSchema)
        .optional()
        .describe("Entities, rows, or records Agent should avoid returning again."),
    })
    .optional(),
  effort: effortSchema
    .optional()
    .describe(
      "Agent effort: minimal, low, medium, high, xhigh, or auto. Defaults to low. Efforts above medium may exceed the streaming window and be cancelled.",
    ),
};

const TERMINAL_EVENTS = new Map<string, "completed" | "failed" | "cancelled">([
  ["agent_run.completed", "completed"],
  ["agent_run.failed", "failed"],
  ["agent_run.cancelled", "cancelled"],
]);

// Leave headroom under the api/mcp.ts maxDuration in vercel.json (800s) so the
// tool can cancel the run and return a structured error before the platform
// kills the function mid-call.
export const DEFAULT_STREAM_DEADLINE_MS = 750_000;
// MCP clients reset their per-request timeout when a progress notification
// arrives, and idle intermediaries reap quiet connections — keep both alive
// through silent phases of the run.
export const DEFAULT_HEARTBEAT_MS = 15_000;

export type AgentRunStreamClient = {
  createStream: (runInput: AgentRunInput) => Promise<AsyncIterable<AgentEvent>>;
  cancelRun: (runId: string) => Promise<unknown>;
};

export type StreamRunOutcome = {
  status:
    | "completed"
    | "failed"
    | "cancelled"
    | "client_aborted"
    | "deadline_exceeded"
    | "no_terminal_event";
  terminalEvent: AgentEvent | null;
  eventCount: number;
  runId: string | null;
  runCancelAttempted: boolean;
  runCancelSucceeded: boolean;
};

export function formatProgressMessage(event: AgentEvent, runId: string | null): string {
  const parts: string[] = [event.event];
  if (event.event === "agent_run.created" && runId != null) {
    parts.push(runId);
  }
  const data = (event.data ?? {}) as Record<string, unknown>;
  for (const key of ["status", "title", "step", "url"]) {
    const value = data[key];
    if (typeof value === "string" && value.length > 0) {
      parts.push(value.slice(0, 120));
      break;
    }
  }
  return parts.join(" — ").slice(0, 200);
}

export async function streamAgentRun(params: {
  client: AgentRunStreamClient;
  runInput: AgentRunInput;
  onProgress?: (progress: number, message: string) => void | Promise<void>;
  signal?: AbortSignal;
  deadlineMs?: number;
  heartbeatMs?: number;
}): Promise<StreamRunOutcome> {
  const deadlineMs = params.deadlineMs ?? DEFAULT_STREAM_DEADLINE_MS;
  const heartbeatMs = params.heartbeatMs ?? DEFAULT_HEARTBEAT_MS;

  let eventCount = 0;
  let progressCounter = 0;
  let runId: string | null = null;
  let terminalEvent: AgentEvent | null = null;
  let lastActivityAt = Date.now();
  let iterator: AsyncIterator<AgentEvent> | undefined;

  const emitProgress = async (message: string): Promise<void> => {
    if (params.onProgress == null) return;
    // Increment before delivery so values stay monotonic across the event
    // relay and the heartbeat timer, which share this counter.
    progressCounter += 1;
    try {
      await params.onProgress(progressCounter, message);
    } catch {
      // Progress delivery is best-effort; never let it break the run.
    }
  };

  type Interrupt = "client_aborted" | "deadline_exceeded";
  let interruptFired: ((reason: Interrupt) => void) | undefined;
  const interrupted = new Promise<Interrupt>((resolve) => {
    interruptFired = resolve;
  });
  const onAbort = () => interruptFired?.("client_aborted");
  const deadlineTimer = setTimeout(() => interruptFired?.("deadline_exceeded"), deadlineMs);
  const heartbeatTimer = setInterval(
    () => {
      if (Date.now() - lastActivityAt < heartbeatMs) return;
      lastActivityAt = Date.now();
      void emitProgress(
        `waiting: run ${runId ?? "pending"} in progress (${eventCount} events so far)`,
      );
    },
    Math.max(heartbeatMs, 1),
  );

  const cleanup = (): void => {
    clearTimeout(deadlineTimer);
    clearInterval(heartbeatTimer);
    params.signal?.removeEventListener("abort", onAbort);
    // Release the underlying stream without awaiting: a generator suspended on
    // a pending await will not settle its return() until that await does.
    void iterator?.return?.(undefined).catch(() => {});
  };

  const finish = async (status: StreamRunOutcome["status"]): Promise<StreamRunOutcome> => {
    cleanup();
    let runCancelAttempted = false;
    let runCancelSucceeded = false;
    // On interruption the run keeps executing (and billing) server-side unless
    // we cancel it. For ZDR its output is unrecoverable anyway.
    if ((status === "client_aborted" || status === "deadline_exceeded") && runId != null) {
      runCancelAttempted = true;
      try {
        await params.client.cancelRun(runId);
        runCancelSucceeded = true;
      } catch {
        // Reported via runCancelSucceeded; the caller surfaces guidance.
      }
    }
    return { status, terminalEvent, eventCount, runId, runCancelAttempted, runCancelSucceeded };
  };

  if (params.signal?.aborted) {
    return finish("client_aborted");
  }
  params.signal?.addEventListener("abort", onAbort, { once: true });

  try {
    const streamPromise = params.client.createStream(params.runInput);
    const created = await Promise.race([
      streamPromise.then((events) => ({ kind: "events" as const, events })),
      interrupted.then((reason) => ({ kind: "interrupt" as const, reason })),
    ]);
    if (created.kind === "interrupt") {
      // If the stream materializes after we bail, close it immediately. The run
      // may still have started server-side, but without a runId from the event
      // stream there is nothing to cancel.
      void streamPromise
        .then((events) => void events[Symbol.asyncIterator]().return?.(undefined))
        .catch(() => {});
      return await finish(created.reason);
    }
    iterator = created.events[Symbol.asyncIterator]();

    while (true) {
      const next = await Promise.race([
        iterator.next().then((result) => ({ kind: "next" as const, result })),
        interrupted.then((reason) => ({ kind: "interrupt" as const, reason })),
      ]);
      if (next.kind === "interrupt") {
        return await finish(next.reason);
      }
      if (next.result.done) break;

      const event = next.result.value;
      eventCount += 1;
      lastActivityAt = Date.now();
      if (runId == null) {
        const id = (event.data as Record<string, unknown> | undefined)?.id;
        if (typeof id === "string") runId = id;
      }
      await emitProgress(formatProgressMessage(event, runId));

      const terminalStatus = TERMINAL_EVENTS.get(event.event);
      if (terminalStatus != null) {
        // Return as soon as the run is terminal rather than draining the
        // stream: progress MUST stop after completion, and we must not hang if
        // the server keeps the connection open.
        terminalEvent = event;
        return await finish(terminalStatus);
      }
    }
    return await finish("no_terminal_event");
  } catch (error) {
    cleanup();
    throw error;
  }
}

function streamOutcomeToToolContent(outcome: StreamRunOutcome, deadlineMs: number): ToolContent {
  const base = {
    terminalEvent: outcome.terminalEvent?.event ?? null,
    eventCount: outcome.eventCount,
    runId: outcome.runId,
  };
  const cancelNote = outcome.runCancelAttempted
    ? outcome.runCancelSucceeded
      ? `Run ${outcome.runId} was cancelled server-side.`
      : `Cancelling run ${outcome.runId} failed — it may still be executing; cancel it with agent_cancel_run.`
    : "The run could not be cancelled because no run ID was received.";

  switch (outcome.status) {
    case "completed":
      return jsonContent({ success: true, ...base, run: outcome.terminalEvent?.data });
    case "cancelled":
      return jsonContent({ success: false, ...base, run: outcome.terminalEvent?.data });
    case "failed":
      return {
        content: [
          ...jsonContent({ success: false, ...base, run: outcome.terminalEvent?.data }).content,
          {
            type: "text",
            text: "The agent run failed. Inspect run.error above. If outputSchema was provided, verify it is a valid JSON Schema (top-level object, bounded arrays), then retry. ZDR run output is not retrievable after failure.",
          },
        ],
        isError: true,
      };
    case "deadline_exceeded":
      return {
        content: [
          {
            type: "text",
            text: `agent_run_stream error: the run exceeded the ${Math.round(deadlineMs / 1000)}s streaming window after ${outcome.eventCount} events. ${cancelNote} Retry with lower effort (minimal or low) or split the task into smaller runs.`,
          },
        ],
        isError: true,
      };
    case "client_aborted":
      return {
        content: [
          {
            type: "text",
            text: `agent_run_stream cancelled by the client after ${outcome.eventCount} events. ${cancelNote}`,
          },
        ],
        isError: true,
      };
    case "no_terminal_event":
      return {
        content: [
          {
            type: "text",
            text: `agent_run_stream error: the stream ended after ${outcome.eventCount} events without a terminal event. For ZDR teams the output is not retrievable; retry the run.`,
          },
        ],
        isError: true,
      };
  }
}

type StreamToolExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;

export type AgentRunStreamToolOptions = {
  deadlineMs?: number;
  heartbeatMs?: number;
  streamClientFactory?: (config: AgentToolConfig | undefined) => AgentRunStreamClient;
};

function defaultStreamClientFactory(config: AgentToolConfig | undefined): AgentRunStreamClient {
  const client = createExaClient(config, "agent-mcp");
  return {
    createStream: (runInput) =>
      client.agent.runs.create({ ...(runInput as CreateAgentRunParams), stream: true }),
    cancelRun: (runId) => client.agent.runs.cancel(runId),
  };
}

export function registerAgentRunStreamTool(
  server: McpServer,
  config?: AgentToolConfig,
  options?: AgentRunStreamToolOptions,
): void {
  const deadlineMs = options?.deadlineMs ?? DEFAULT_STREAM_DEADLINE_MS;
  server.tool(
    "agent_run_stream",
    "Run an Exa Agent end-to-end in a single streaming call and return the final output directly. Required for Zero Data Retention (ZDR) teams, where runs must stream and output is not retrievable afterwards — if the connection drops mid-run the output is lost and the run must be retried. Progress is relayed as MCP progress notifications, visible to the host UI only; the final tool result is the only content returned to the model. The call stays open until the run finishes and is bounded at ~12 minutes, so prefer minimal or low effort.",
    agentRunStreamInputShape,
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
    },
    async (
      { query, systemPrompt, outputSchema, input, effort },
      extra: StreamToolExtra,
    ): Promise<ToolContent> => {
      const logger = createRequestLogger("agent_run_stream");
      logger.start(query.slice(0, 120));

      try {
        const hasApiKey = typeof config?.exaApiKey === "string" && config.exaApiKey.length > 0;
        const hasOAuthToken =
          typeof config?.oauthAccessToken === "string" && config.oauthAccessToken.length > 0;
        if (!hasApiKey && !hasOAuthToken) {
          throw new Error(
            "Agent tools require user authentication. Provide an Exa API key or OAuth access token.",
          );
        }

        const streamClient = (options?.streamClientFactory ?? defaultStreamClientFactory)(config);

        const runInput: AgentRunInput = {
          query,
          ...(systemPrompt != null ? { systemPrompt } : {}),
          ...(outputSchema != null ? { outputSchema } : {}),
          ...(input != null ? { input } : {}),
          effort: (effort ?? "low") as AgentEffort,
        };

        checkpoint("agent_run_stream_request_prepared", {
          hasSchema: outputSchema != null,
          hasInputData: input?.data != null,
          effort: runInput.effort,
        });

        // Wrappers around the SDK's tools/call handler (e.g. analytics) may drop
        // the `extra` argument entirely; degrade to no progress notifications
        // rather than failing the run.
        const progressToken = extra?._meta?.progressToken;
        // A failed progress notification must not kill the stream: for ZDR runs
        // the output is unrecoverable once the stream is abandoned. Log and stop
        // notifying instead.
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

        const outcome = await streamAgentRun({
          client: streamClient,
          runInput,
          onProgress,
          signal: extra?.signal,
          deadlineMs,
          heartbeatMs: options?.heartbeatMs,
        });

        checkpoint("agent_run_stream_finished", {
          eventCount: outcome.eventCount,
          status: outcome.status,
          terminalEvent: outcome.terminalEvent?.event ?? "none",
        });

        logger.complete();
        return streamOutcomeToToolContent(outcome, deadlineMs);
      } catch (error) {
        logger.error(error);
        return formatAgentToolError(error, "agent_run_stream");
      }
    },
  );
}
