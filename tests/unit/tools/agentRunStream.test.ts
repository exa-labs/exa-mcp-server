import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { AgentEvent } from "exa-js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  agentRunStreamInputShape,
  formatProgressMessage,
  registerAgentRunStreamTool,
  streamAgentRun,
  type AgentRunStreamClient,
} from "../../../src/tools/agentRunStream.js";
import type { AgentRunInput } from "../../../src/types.js";
import { FakeMcpServer } from "../../helpers/fakeMcpServer.js";

function event(name: string, data: Record<string, unknown> = {}): AgentEvent {
  return { event: name, data };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function* streamOf(events: AgentEvent[]): AsyncGenerator<AgentEvent> {
  for (const e of events) {
    yield e;
  }
}

/** Yields the prefix, then blocks forever (simulates a wedged upstream). */
async function* hangingStream(prefix: AgentEvent[]): AsyncGenerator<AgentEvent> {
  for (const e of prefix) {
    yield e;
  }
  await new Promise(() => {});
}

function makeClient(
  events: AsyncIterable<AgentEvent> | (() => Promise<AsyncIterable<AgentEvent>>),
): AgentRunStreamClient & { cancelRun: ReturnType<typeof vi.fn> } {
  return {
    createStream: typeof events === "function" ? events : async () => events,
    cancelRun: vi.fn(async () => ({})),
  };
}

const RUN_INPUT: AgentRunInput = { query: "test", effort: "low" };

const GOLDEN_EVENTS = [
  event("agent_run.created", { id: "agent_run_1", status: "queued" }),
  event("agent_run.started"),
  event("agent_run.output_item.added"),
  event("agent_run.completed", { id: "agent_run_1", status: "completed", output: { text: "done" } }),
];

describe("agentRunStreamInputShape", () => {
  const schema = z.object(agentRunStreamInputShape);

  it("accepts a minimal valid input", () => {
    expect(schema.safeParse({ query: "find things" }).success).toBe(true);
  });

  it("accepts a fully specified input", () => {
    const result = schema.safeParse({
      query: "enrich these companies",
      systemPrompt: "be terse",
      outputSchema: { type: "object", properties: {} },
      input: { data: [{ name: "Exa" }], exclusion: [{ name: "Acme" }] },
      effort: "minimal",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing or empty query", () => {
    expect(schema.safeParse({}).success).toBe(false);
    expect(schema.safeParse({ query: "" }).success).toBe(false);
  });

  it("rejects an unknown effort value", () => {
    expect(schema.safeParse({ query: "x", effort: "turbo" }).success).toBe(false);
  });

  it("rejects a non-object outputSchema", () => {
    expect(schema.safeParse({ query: "x", outputSchema: "not a schema" }).success).toBe(false);
    expect(schema.safeParse({ query: "x", outputSchema: 42 }).success).toBe(false);
  });
});

describe("formatProgressMessage", () => {
  it("includes the run ID on the created event", () => {
    const message = formatProgressMessage(
      event("agent_run.created", { id: "agent_run_1", status: "queued" }),
      "agent_run_1",
    );
    expect(message).toContain("agent_run.created");
    expect(message).toContain("agent_run_1");
    expect(message).toContain("queued");
  });

  it("falls back to the bare event name", () => {
    expect(formatProgressMessage(event("agent_run.started"), "agent_run_1")).toBe(
      "agent_run.started",
    );
  });

  it("caps the message length", () => {
    const message = formatProgressMessage(
      event("agent_run.step", { title: "x".repeat(500) }),
      null,
    );
    expect(message.length).toBeLessThanOrEqual(200);
  });
});

describe("streamAgentRun", () => {
  it("relays every event as monotonic progress and returns the completed terminal", async () => {
    const client = makeClient(streamOf(GOLDEN_EVENTS));
    const progresses: Array<[number, string]> = [];

    const outcome = await streamAgentRun({
      client,
      runInput: RUN_INPUT,
      onProgress: (progress, message) => {
        progresses.push([progress, message]);
      },
    });

    expect(outcome.status).toBe("completed");
    expect(outcome.eventCount).toBe(4);
    expect(outcome.runId).toBe("agent_run_1");
    expect(outcome.terminalEvent?.data).toMatchObject({ status: "completed" });
    expect(outcome.runCancelAttempted).toBe(false);
    expect(client.cancelRun).not.toHaveBeenCalled();

    expect(progresses).toHaveLength(4);
    expect(progresses.map(([p]) => p)).toEqual([1, 2, 3, 4]);
    expect(progresses[0][1]).toContain("agent_run_1");
    expect(progresses[1][1]).toContain("agent_run.started");
  });

  it("maps failed and cancelled terminal events to their statuses", async () => {
    for (const [terminal, status] of [
      ["agent_run.failed", "failed"],
      ["agent_run.cancelled", "cancelled"],
    ] as const) {
      const outcome = await streamAgentRun({
        client: makeClient(streamOf([event("agent_run.created", { id: "r" }), event(terminal)])),
        runInput: RUN_INPUT,
      });
      expect(outcome.status).toBe(status);
      expect(outcome.terminalEvent?.event).toBe(terminal);
    }
  });

  it("reports no_terminal_event when the stream ends early", async () => {
    const outcome = await streamAgentRun({
      client: makeClient(streamOf([event("agent_run.created"), event("agent_run.started")])),
      runInput: RUN_INPUT,
    });
    expect(outcome.status).toBe("no_terminal_event");
    expect(outcome.eventCount).toBe(2);
  });

  it("stops consuming as soon as the terminal event arrives", async () => {
    let pulledPastTerminal = false;
    async function* trailing(): AsyncGenerator<AgentEvent> {
      yield event("agent_run.created", { id: "r" });
      yield event("agent_run.completed");
      pulledPastTerminal = true;
      yield event("agent_run.after");
    }

    const outcome = await streamAgentRun({ client: makeClient(trailing()), runInput: RUN_INPUT });

    expect(outcome.status).toBe("completed");
    expect(outcome.eventCount).toBe(2);
    expect(pulledPastTerminal).toBe(false);
  });

  it("survives a throwing onProgress callback", async () => {
    const outcome = await streamAgentRun({
      client: makeClient(streamOf(GOLDEN_EVENTS)),
      runInput: RUN_INPUT,
      onProgress: () => {
        throw new Error("notification channel is broken");
      },
    });
    expect(outcome.status).toBe("completed");
    expect(outcome.eventCount).toBe(4);
  });

  it("emits heartbeat progress during quiet gaps", async () => {
    async function* quietGap(): AsyncGenerator<AgentEvent> {
      yield event("agent_run.created", { id: "agent_run_1" });
      await sleep(120);
      yield event("agent_run.completed");
    }
    const progresses: Array<[number, string]> = [];

    const outcome = await streamAgentRun({
      client: makeClient(quietGap()),
      runInput: RUN_INPUT,
      onProgress: (progress, message) => {
        progresses.push([progress, message]);
      },
      heartbeatMs: 30,
    });

    expect(outcome.status).toBe("completed");
    const heartbeats = progresses.filter(([, message]) => message.startsWith("waiting:"));
    expect(heartbeats.length).toBeGreaterThanOrEqual(1);
    expect(heartbeats[0][1]).toContain("agent_run_1");
    const values = progresses.map(([p]) => p);
    expect([...values].sort((a, b) => a - b)).toEqual(values);
    expect(new Set(values).size).toBe(values.length);
  });

  it("cancels the run when the client aborts mid-stream", async () => {
    const controller = new AbortController();
    const client = makeClient(hangingStream([event("agent_run.created", { id: "agent_run_1" })]));

    const outcome = await streamAgentRun({
      client,
      runInput: RUN_INPUT,
      onProgress: () => {
        controller.abort();
      },
      signal: controller.signal,
    });

    expect(outcome.status).toBe("client_aborted");
    expect(outcome.eventCount).toBe(1);
    expect(outcome.runCancelAttempted).toBe(true);
    expect(outcome.runCancelSucceeded).toBe(true);
    expect(client.cancelRun).toHaveBeenCalledWith("agent_run_1");
  });

  it("returns immediately without creating a stream when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const createStream = vi.fn(async () => streamOf(GOLDEN_EVENTS));

    const outcome = await streamAgentRun({
      client: { createStream, cancelRun: vi.fn() },
      runInput: RUN_INPUT,
      signal: controller.signal,
    });

    expect(outcome.status).toBe("client_aborted");
    expect(outcome.eventCount).toBe(0);
    expect(outcome.runCancelAttempted).toBe(false);
    expect(createStream).not.toHaveBeenCalled();
  });

  it("cancels the run when the deadline expires on a wedged stream", async () => {
    const client = makeClient(hangingStream([event("agent_run.created", { id: "agent_run_1" })]));

    const outcome = await streamAgentRun({
      client,
      runInput: RUN_INPUT,
      deadlineMs: 40,
      heartbeatMs: 10_000,
    });

    expect(outcome.status).toBe("deadline_exceeded");
    expect(outcome.runId).toBe("agent_run_1");
    expect(client.cancelRun).toHaveBeenCalledWith("agent_run_1");
  });

  it("handles a deadline that expires before the stream is even created", async () => {
    const cancelRun = vi.fn();
    const outcome = await streamAgentRun({
      client: {
        createStream: () => new Promise(() => {}),
        cancelRun,
      },
      runInput: RUN_INPUT,
      deadlineMs: 20,
    });

    expect(outcome.status).toBe("deadline_exceeded");
    expect(outcome.runId).toBeNull();
    expect(outcome.runCancelAttempted).toBe(false);
    expect(cancelRun).not.toHaveBeenCalled();
  });

  it("reports a failed cancellation without throwing", async () => {
    const client = makeClient(hangingStream([event("agent_run.created", { id: "agent_run_1" })]));
    client.cancelRun.mockRejectedValue(new Error("cancel endpoint down"));

    const outcome = await streamAgentRun({
      client,
      runInput: RUN_INPUT,
      deadlineMs: 40,
      heartbeatMs: 10_000,
    });

    expect(outcome.status).toBe("deadline_exceeded");
    expect(outcome.runCancelAttempted).toBe(true);
    expect(outcome.runCancelSucceeded).toBe(false);
  });

  it("propagates stream errors after cleaning up", async () => {
    async function* explodes(): AsyncGenerator<AgentEvent> {
      yield event("agent_run.created", { id: "r" });
      throw Object.assign(new Error("boom"), { statusCode: 500 });
    }
    await expect(
      streamAgentRun({ client: makeClient(explodes()), runInput: RUN_INPUT }),
    ).rejects.toThrow("boom");
  });
});

describe("agent_run_stream tool handler", () => {
  type Notification = { method: string; params: Record<string, unknown> };

  function setup(options?: {
    events?: AsyncIterable<AgentEvent>;
    createStream?: () => Promise<AsyncIterable<AgentEvent>>;
    config?: { exaApiKey?: string; oauthAccessToken?: string };
    deadlineMs?: number;
    heartbeatMs?: number;
    sendNotification?: (notification: Notification) => Promise<void>;
    progressToken?: string | number;
    signal?: AbortSignal;
  }) {
    const fake = new FakeMcpServer();
    const cancelRun = vi.fn(async () => ({}));
    const client: AgentRunStreamClient = {
      createStream: options?.createStream ?? (async () => options?.events ?? streamOf(GOLDEN_EVENTS)),
      cancelRun,
    };

    registerAgentRunStreamTool(
      fake as unknown as McpServer,
      options?.config ?? { exaApiKey: "test-key" },
      {
        streamClientFactory: () => client,
        deadlineMs: options?.deadlineMs,
        heartbeatMs: options?.heartbeatMs ?? 10_000,
      },
    );

    const notifications: Notification[] = [];
    const sendNotification = vi.fn(async (notification: Notification) => {
      notifications.push(notification);
      await options?.sendNotification?.(notification);
    });
    const extra = {
      _meta: options?.progressToken != null ? { progressToken: options.progressToken } : undefined,
      sendNotification,
      signal: options?.signal ?? new AbortController().signal,
    };

    const tool = fake.getTool("agent_run_stream");
    const invoke = (args: Record<string, unknown> = { query: "test" }, extraArg: unknown = extra) =>
      tool.handler(args, extraArg) as Promise<{
        content: Array<{ type: "text"; text: string }>;
        isError?: true;
      }>;

    return { tool, invoke, extra, notifications, sendNotification, cancelRun };
  }

  function parsePayload(result: { content: Array<{ text: string }> }): Record<string, unknown> {
    return JSON.parse(result.content[0].text) as Record<string, unknown>;
  }

  it("golden path: returns the terminal payload and relays progress notifications", async () => {
    const { invoke, notifications } = setup({ progressToken: "tok-1" });

    const result = await invoke();

    expect(result.isError).toBeUndefined();
    const payload = parsePayload(result);
    expect(payload).toMatchObject({
      success: true,
      terminalEvent: "agent_run.completed",
      eventCount: 4,
      runId: "agent_run_1",
    });
    expect(payload.run).toMatchObject({ status: "completed" });

    expect(notifications).toHaveLength(4);
    for (const notification of notifications) {
      expect(notification.method).toBe("notifications/progress");
      expect(notification.params.progressToken).toBe("tok-1");
    }
    const values = notifications.map((n) => n.params.progress as number);
    expect(values).toEqual([1, 2, 3, 4]);
  });

  it("sends no notifications when the client did not provide a progressToken", async () => {
    const { invoke, sendNotification } = setup();
    const result = await invoke();
    expect(result.isError).toBeUndefined();
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("tolerates a missing extra argument entirely", async () => {
    const { invoke } = setup();
    const result = await invoke({ query: "test" }, undefined);
    expect(result.isError).toBeUndefined();
    expect(parsePayload(result).success).toBe(true);
  });

  it("stops notifying after the first notification failure but still finishes the run", async () => {
    const { invoke, sendNotification } = setup({
      progressToken: "tok-1",
      sendNotification: async () => {
        throw new Error("connection reset");
      },
    });

    const result = await invoke();

    expect(result.isError).toBeUndefined();
    expect(parsePayload(result).success).toBe(true);
    expect(sendNotification).toHaveBeenCalledTimes(1);
  });

  it("marks a failed run as isError with recovery guidance", async () => {
    const { invoke } = setup({
      events: streamOf([
        event("agent_run.created", { id: "agent_run_1" }),
        event("agent_run.failed", { id: "agent_run_1", error: "provider unavailable" }),
      ]),
    });

    const result = await invoke();

    expect(result.isError).toBe(true);
    const payload = parsePayload(result);
    expect(payload).toMatchObject({ success: false, terminalEvent: "agent_run.failed" });
    expect(payload.run).toMatchObject({ error: "provider unavailable" });
    expect(result.content[1].text).toContain("outputSchema");
  });

  it("returns a cancelled run as a non-error result", async () => {
    const { invoke } = setup({
      events: streamOf([event("agent_run.created", { id: "r" }), event("agent_run.cancelled")]),
    });

    const result = await invoke();

    expect(result.isError).toBeUndefined();
    expect(parsePayload(result)).toMatchObject({
      success: false,
      terminalEvent: "agent_run.cancelled",
    });
  });

  it("returns an auth error when no API key or OAuth token is configured", async () => {
    const { invoke } = setup({ config: {} });
    const result = await invoke();
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("authentication");
  });

  it("surfaces an Exa 400 (e.g. invalid outputSchema) with status guidance", async () => {
    const { invoke } = setup({
      createStream: async () => {
        throw Object.assign(new Error("outputSchema is not a valid JSON Schema"), {
          statusCode: 400,
        });
      },
    });

    const result = await invoke({ query: "test", outputSchema: { type: "banana" } });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("agent_run_stream error (400)");
    expect(result.content[0].text).toContain("outputSchema");
  });

  it("returns an isError result when the stream ends without a terminal event", async () => {
    const { invoke } = setup({
      events: streamOf([event("agent_run.created", { id: "r" }), event("agent_run.started")]),
    });

    const result = await invoke();

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("without a terminal event");
    expect(result.content[0].text).toContain("retry");
  });

  it("cancels the run and reports a structured error when the deadline expires", async () => {
    const { invoke, cancelRun } = setup({
      events: hangingStream([event("agent_run.created", { id: "agent_run_1" })]),
      deadlineMs: 40,
      progressToken: "tok-1",
    });

    const result = await invoke();

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("streaming window");
    expect(result.content[0].text).toContain("agent_run_1 was cancelled");
    expect(result.content[0].text).toContain("lower effort");
    expect(cancelRun).toHaveBeenCalledWith("agent_run_1");
  });

  it("cancels the run when the client aborts the request", async () => {
    const controller = new AbortController();
    const { invoke, cancelRun } = setup({
      events: hangingStream([event("agent_run.created", { id: "agent_run_1" })]),
      progressToken: "tok-1",
      signal: controller.signal,
      sendNotification: async () => {
        controller.abort();
      },
    });

    const result = await invoke();

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("cancelled by the client");
    expect(cancelRun).toHaveBeenCalledWith("agent_run_1");
  });

  it("registers with a ZDR-aware description and non-idempotent annotations", () => {
    const { tool } = setup();
    expect(tool.description).toContain("Zero Data Retention");
    expect(tool.description).toContain("progress notifications");
    expect(tool.annotations).toMatchObject({ readOnlyHint: false, idempotentHint: false });
  });
});
