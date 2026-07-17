import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { AgentEvent, AgentRun } from "exa-js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  agentRunInputShape,
  DEFAULT_CALL_WINDOW_MS,
  formatProgressMessage,
  pollAgentRun,
  registerAgentRunTool,
  resolveAgentCallWindowMs,
  streamAgentRun,
  type AgentRunClient,
} from "../../../src/tools/agentRun.js";
import type { AgentRunInput } from "../../../src/types.js";
import { FakeMcpServer } from "../../helpers/fakeMcpServer.js";

function event(name: string, data: Record<string, unknown> = {}): AgentEvent {
  return { event: name, data };
}

async function* streamOf(events: AgentEvent[]): AsyncGenerator<AgentEvent> {
  for (const item of events) yield item;
}

async function* hangingStream(prefix: AgentEvent[]): AsyncGenerator<AgentEvent> {
  for (const item of prefix) yield item;
  await new Promise(() => {});
}

async function* failingStream(): AsyncGenerator<AgentEvent> {
  yield event("agent_run.created", { id: "agent_run_1", status: "queued" });
  throw new Error("stream connection reset");
}

async function* failsBeforeId(): AsyncGenerator<AgentEvent> {
  throw new Error("stream failed before first event");
}

function completedRun(overrides: Partial<AgentRun> = {}): AgentRun {
  return {
    id: "agent_run_1",
    status: "completed",
    output: { text: "done", structured: null, grounding: [] },
    usage: { searches: 1 },
    costDollars: { total: 0.012 },
    ...overrides,
  };
}

const COMPLETED_EVENTS = [
  event("agent_run.created", { id: "agent_run_1", status: "queued" }),
  event("agent_run.started", { status: "running" }),
  event("agent_run.completed", completedRun()),
];

type Notification = { method: string; params: Record<string, unknown> };

function setup(options: {
  events?: AsyncIterable<AgentEvent>;
  createStream?: AgentRunClient["createStream"];
  getRun?: AgentRunClient["getRun"];
  cancelRun?: AgentRunClient["cancelRun"];
  config?: { exaApiKey?: string; oauthAccessToken?: string };
  callWindowMs?: number;
  heartbeatMs?: number;
  pollIntervalMs?: number;
  progressTimeoutMs?: number;
  cancelTimeoutMs?: number;
  progressToken?: string | number;
  signal?: AbortSignal;
  sendNotification?: (notification: Notification) => void | Promise<void>;
} = {}) {
  const fake = new FakeMcpServer();
  const createStream = vi.fn(
    options.createStream ?? (async () => options.events ?? streamOf(COMPLETED_EVENTS)),
  );
  const getRun = vi.fn(options.getRun ?? (async () => completedRun()));
  const cancelRun = vi.fn(options.cancelRun ?? (async () => completedRun({ status: "cancelled" })));
  const client: AgentRunClient = { createStream, getRun, cancelRun };

  registerAgentRunTool(
    fake as unknown as McpServer,
    options.config ?? { exaApiKey: "test-key" },
    {
      clientFactory: () => client,
      callWindowMs: options.callWindowMs,
      heartbeatMs: options.heartbeatMs ?? 10_000,
      pollIntervalMs: options.pollIntervalMs,
      progressTimeoutMs: options.progressTimeoutMs,
      cancelTimeoutMs: options.cancelTimeoutMs,
    },
  );

  const notifications: Notification[] = [];
  const sendNotification = vi.fn(async (notification: Notification) => {
    notifications.push(notification);
    await options.sendNotification?.(notification);
  });
  const extra = {
    _meta: options.progressToken != null ? { progressToken: options.progressToken } : undefined,
    sendNotification,
    signal: options.signal ?? new AbortController().signal,
  };

  const tool = fake.getTool("agent_run");
  const invoke = (args: Record<string, unknown>, extraArg: unknown = extra) =>
    tool.handler(args, extraArg) as Promise<{
      content: Array<{ type: "text"; text: string }>;
      isError?: true;
    }>;

  return {
    tool,
    invoke,
    createStream,
    getRun,
    cancelRun,
    notifications,
    sendNotification,
  };
}

function payload(result: { content: Array<{ text: string }> }): Record<string, unknown> {
  return JSON.parse(result.content[0].text) as Record<string, unknown>;
}

describe("resolveAgentCallWindowMs", () => {
  it("defaults to max duration minus headroom", () => {
    expect(resolveAgentCallWindowMs()).toBe(DEFAULT_CALL_WINDOW_MS);
    expect(resolveAgentCallWindowMs({ mcpMaxDurationSeconds: 600 })).toBe(550_000);
  });

  it("honors AGENT_CALL_WINDOW_MS when within the ceiling", () => {
    expect(resolveAgentCallWindowMs({ agentCallWindowMs: 300_000 })).toBe(300_000);
  });

  it("caps AGENT_CALL_WINDOW_MS at max duration minus headroom", () => {
    expect(
      resolveAgentCallWindowMs({
        agentCallWindowMs: 900_000,
        mcpMaxDurationSeconds: 800,
      }),
    ).toBe(DEFAULT_CALL_WINDOW_MS);
  });
});

describe("agentRunInputShape", () => {
  const schema = z.object(agentRunInputShape);

  it("accepts new-run, resume, provider, and effort inputs", () => {
    expect(schema.safeParse({ query: "research this" }).success).toBe(true);
    expect(schema.safeParse({ runId: "agent_run_123" }).success).toBe(true);
    expect(
      schema.safeParse({
        query: "enrich this",
        dataSources: [
          { provider: "fiber" },
          { provider: "financial_datasets" },
          { provider: "similarweb" },
          { provider: "baselayer" },
          { provider: "affiliate" },
        ],
        previousRunId: "agent_run_previous",
        effort: "minimal",
      }).success,
    ).toBe(true);
  });

  it("rejects malformed run IDs, providers, and effort values", () => {
    expect(schema.safeParse({ runId: "wrong" }).success).toBe(false);
    expect(schema.safeParse({ query: "x", dataSources: [{ provider: "unknown" }] }).success).toBe(false);
    expect(schema.safeParse({ query: "x", effort: "turbo" }).success).toBe(false);
  });
});

describe("formatProgressMessage", () => {
  it("includes the run ID and a useful event field", () => {
    expect(
      formatProgressMessage(
        event("agent_run.created", { id: "agent_run_1", status: "queued" }),
        "agent_run_1",
      ),
    ).toBe("agent_run.created — agent_run_1 — queued");
  });

  it("caps progress messages", () => {
    expect(formatProgressMessage(event("agent_run.step", { title: "x".repeat(500) }), null).length)
      .toBeLessThanOrEqual(200);
  });
});

describe("streamAgentRun", () => {
  it("does not start a paid run when the request is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const client: AgentRunClient = {
      createStream: vi.fn(async () => streamOf(COMPLETED_EVENTS)),
      getRun: vi.fn(),
      cancelRun: vi.fn(),
    };

    const outcome = await streamAgentRun({
      client,
      runInput: { query: "test", effort: "low" },
      signal: controller.signal,
    });

    expect(outcome.status).toBe("client_aborted");
    expect(client.createStream).not.toHaveBeenCalled();
    expect(client.cancelRun).not.toHaveBeenCalled();
  });

  it("returns a run-ID handoff at the call boundary without cancelling", async () => {
    const client: AgentRunClient = {
      createStream: vi.fn(async () =>
        hangingStream([event("agent_run.created", { id: "agent_run_1", status: "queued" })]),
      ),
      getRun: vi.fn(),
      cancelRun: vi.fn(),
    };

    const outcome = await streamAgentRun({
      client,
      runInput: { query: "test", effort: "low" },
      callWindowMs: 20,
      heartbeatMs: 10_000,
    });

    expect(outcome).toMatchObject({
      status: "running",
      runId: "agent_run_1",
      handoffReason: "stream_window_exceeded",
      runCancelAttempted: false,
    });
    expect(client.cancelRun).not.toHaveBeenCalled();
  });

  it("turns clean EOF and read errors with a known ID into recoverable handoffs", async () => {
    for (const events of [
      streamOf([event("agent_run.created", { id: "agent_run_1" })]),
      failingStream(),
    ]) {
      const client: AgentRunClient = {
        createStream: vi.fn(async () => events),
        getRun: vi.fn(),
        cancelRun: vi.fn(),
      };
      const outcome = await streamAgentRun({
        client,
        runInput: { query: "test", effort: "low" },
      });
      expect(outcome).toMatchObject({
        status: "running",
        runId: "agent_run_1",
        handoffReason: "stream_interrupted",
      });
      expect(client.cancelRun).not.toHaveBeenCalled();
    }
  });

  it("prefers explicit cancellation when abort races a stream read failure", async () => {
    const controller = new AbortController();
    async function* abortsThenFails(): AsyncGenerator<AgentEvent> {
      yield event("agent_run.created", { id: "agent_run_1" });
      controller.abort();
      throw new Error("connection reset during abort");
    }
    const client: AgentRunClient = {
      createStream: vi.fn(async () => abortsThenFails()),
      getRun: vi.fn(),
      cancelRun: vi.fn(async () => ({})),
    };

    const outcome = await streamAgentRun({
      client,
      runInput: { query: "test", effort: "low" },
      signal: controller.signal,
      cancelTimeoutMs: 20,
    });

    expect(outcome.status).toBe("client_aborted");
    expect(client.cancelRun).toHaveBeenCalledWith("agent_run_1");
  });

  it("bounds a hanging progress callback", async () => {
    const client: AgentRunClient = {
      createStream: vi.fn(async () => streamOf(COMPLETED_EVENTS)),
      getRun: vi.fn(),
      cancelRun: vi.fn(),
    };

    const outcome = await Promise.race([
      streamAgentRun({
        client,
        runInput: { query: "test", effort: "low" },
        onProgress: () => new Promise(() => {}),
        progressTimeoutMs: 10,
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("progress hung")), 250)),
    ]);

    expect(outcome.status).toBe("completed");
  });
});

describe("pollAgentRun", () => {
  it("stops waiting without cancelling when a resume request is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const client: AgentRunClient = {
      createStream: vi.fn(),
      getRun: vi.fn(async () => completedRun()),
      cancelRun: vi.fn(async () => ({})),
    };

    const outcome = await pollAgentRun({
      client,
      runId: "agent_run_1",
      signal: controller.signal,
    });

    expect(outcome).toMatchObject({
      status: "running",
      runId: "agent_run_1",
      runCancelAttempted: false,
    });
    expect(client.getRun).not.toHaveBeenCalled();
    expect(client.cancelRun).not.toHaveBeenCalled();
  });

  it("returns a run-ID handoff without cancelling when a resume wait is aborted mid-poll", async () => {
    const controller = new AbortController();
    const client: AgentRunClient = {
      createStream: vi.fn(),
      getRun: vi.fn(async () => {
        controller.abort();
        return completedRun({ status: "running", output: null });
      }),
      cancelRun: vi.fn(async () => ({})),
    };

    const outcome = await pollAgentRun({
      client,
      runId: "agent_run_1",
      signal: controller.signal,
      pollIntervalMs: 50,
    });

    expect(outcome).toMatchObject({
      status: "running",
      runId: "agent_run_1",
      runCancelAttempted: false,
    });
    expect(client.cancelRun).not.toHaveBeenCalled();
  });
});

describe("agent_run tool", () => {
  it("always creates new runs with streaming and returns the canonical terminal shape", async () => {
    const { invoke, createStream, getRun } = setup();
    const result = await invoke({
      query: "research this",
      systemPrompt: "be concise",
      outputSchema: { type: "object", properties: {} },
      input: { data: [{ company: "Exa" }], exclusion: [{ company: "Acme" }] },
      dataSources: [{ provider: "similarweb" }],
      previousRunId: "agent_run_previous",
    });

    expect(result.isError).toBeUndefined();
    expect(payload(result)).toEqual({
      success: true,
      id: "agent_run_1",
      status: "completed",
      outputReady: true,
      output: { text: "done", structured: null, grounding: [] },
      usage: { searches: 1 },
      costDollars: { total: 0.012 },
    });
    expect(createStream).toHaveBeenCalledWith({
      query: "research this",
      systemPrompt: "be concise",
      outputSchema: { type: "object", properties: {} },
      input: { data: [{ company: "Exa" }], exclusion: [{ company: "Acme" }] },
      dataSources: [{ provider: "similarweb" }],
      previousRunId: "agent_run_previous",
      effort: "low",
    });
    expect(getRun).not.toHaveBeenCalled();
  });

  it("forwards an explicit effort", async () => {
    const { invoke, createStream } = setup();
    await invoke({ query: "test", effort: "minimal" });
    expect(createStream).toHaveBeenCalledWith({ query: "test", effort: "minimal" });
  });

  it("relays monotonic MCP progress notifications", async () => {
    const { invoke, notifications } = setup({ progressToken: "progress-1" });
    await invoke({ query: "test" });

    expect(notifications).toHaveLength(3);
    expect(notifications.map((notification) => notification.method)).toEqual([
      "notifications/progress",
      "notifications/progress",
      "notifications/progress",
    ]);
    expect(notifications.map((notification) => notification.params.progress)).toEqual([1, 2, 3]);
    expect(notifications.every((notification) => notification.params.progressToken === "progress-1"))
      .toBe(true);
  });

  it("returns a non-error run-ID handoff without cancelling at the stream boundary", async () => {
    const { invoke, cancelRun } = setup({
      events: hangingStream([event("agent_run.created", { id: "agent_run_1" })]),
      callWindowMs: 20,
    });

    const result = await invoke({ query: "test" });

    expect(result.isError).toBeUndefined();
    expect(payload(result)).toEqual({
      success: true,
      id: "agent_run_1",
      status: "running",
      outputReady: false,
      message: "The run is still in progress. Call agent_run again with runId=agent_run_1 to continue waiting.",
    });
    expect(cancelRun).not.toHaveBeenCalled();
  });

  it("warns about unknown upstream state when a stream fails before yielding an ID", async () => {
    const { invoke } = setup({ events: failsBeforeId() });

    const result = await invoke({ query: "test" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Upstream state is unknown");
    expect(result.content[0].text).toContain("duplicate run");
  });

  it("resumes a retained run with GET polling", async () => {
    const getRun = vi
      .fn<AgentRunClient["getRun"]>()
      .mockResolvedValueOnce(completedRun({ status: "running", output: null }))
      .mockResolvedValueOnce(completedRun());
    const { invoke, createStream } = setup({ getRun, pollIntervalMs: 1 });

    const result = await invoke({ runId: "agent_run_1" });

    expect(result.isError).toBeUndefined();
    expect(payload(result)).toMatchObject({
      success: true,
      id: "agent_run_1",
      status: "completed",
      outputReady: true,
    });
    expect(getRun).toHaveBeenCalledTimes(2);
    expect(createStream).not.toHaveBeenCalled();
  });

  it("returns the ID again if a resumed run outlives another call window", async () => {
    const { invoke, cancelRun } = setup({
      getRun: async () => completedRun({ status: "running", output: null }),
      callWindowMs: 20,
      pollIntervalMs: 100,
    });

    const result = await invoke({ runId: "agent_run_1" });

    expect(result.isError).toBeUndefined();
    expect(payload(result)).toMatchObject({
      success: true,
      id: "agent_run_1",
      status: "running",
      outputReady: false,
    });
    expect(cancelRun).not.toHaveBeenCalled();
  });

  it("cancels upstream when the MCP client aborts a streaming create call", async () => {
    const controller = new AbortController();
    const { invoke, cancelRun } = setup({
      events: hangingStream([event("agent_run.created", { id: "agent_run_1" })]),
      signal: controller.signal,
      progressToken: "progress-1",
      sendNotification: () => controller.abort(),
      cancelTimeoutMs: 20,
    });

    const result = await invoke({ query: "test" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("cancelled by the client");
    expect(cancelRun).toHaveBeenCalledWith("agent_run_1");
  });

  it("stops a resume wait without cancelling when the MCP client aborts", async () => {
    const controller = new AbortController();
    const { invoke, cancelRun } = setup({
      getRun: async () => {
        controller.abort();
        return completedRun({ status: "running", output: null });
      },
      signal: controller.signal,
      progressToken: "progress-1",
      sendNotification: () => controller.abort(),
      pollIntervalMs: 50,
    });

    const result = await invoke({ runId: "agent_run_1" });

    expect(result.isError).toBeUndefined();
    expect(payload(result)).toMatchObject({
      success: true,
      id: "agent_run_1",
      status: "running",
      outputReady: false,
    });
    expect(cancelRun).not.toHaveBeenCalled();
  });

  it("does not hang if upstream cancellation never settles", async () => {
    const controller = new AbortController();
    const { invoke } = setup({
      events: hangingStream([event("agent_run.created", { id: "agent_run_1" })]),
      signal: controller.signal,
      progressToken: "progress-1",
      sendNotification: () => controller.abort(),
      cancelRun: () => new Promise(() => {}),
      cancelTimeoutMs: 10,
    });

    const result = await Promise.race([
      invoke({ query: "test" }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("cancel hung")), 250)),
    ]);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("could not be cancelled");
  });

  it("returns failed and cancelled terminal states", async () => {
    const failed = setup({
      events: streamOf([
        event("agent_run.created", { id: "agent_run_1" }),
        event("agent_run.failed", { id: "agent_run_1", error: { message: "bad schema" } }),
      ]),
    });
    const failedResult = await failed.invoke({ query: "test" });
    expect(failedResult.isError).toBe(true);
    expect(payload(failedResult)).toMatchObject({ success: false, status: "failed" });

    const cancelled = setup({
      events: streamOf([
        event("agent_run.created", { id: "agent_run_1" }),
        event("agent_run.cancelled", { id: "agent_run_1" }),
      ]),
    });
    const cancelledResult = await cancelled.invoke({ query: "test" });
    expect(cancelledResult.isError).toBeUndefined();
    expect(payload(cancelledResult)).toEqual({
      success: false,
      id: "agent_run_1",
      status: "cancelled",
      outputReady: false,
    });
  });

  it("rejects invalid argument combinations and resume-only create options", async () => {
    const { invoke, createStream, getRun } = setup();

    for (const args of [
      {},
      { query: "test", runId: "agent_run_1" },
      { runId: "agent_run_1", effort: "low" },
    ]) {
      const result = await invoke(args);
      expect(result.isError).toBe(true);
    }

    expect(createStream).not.toHaveBeenCalled();
    expect(getRun).not.toHaveBeenCalled();
  });

  it("requires user authentication", async () => {
    const { invoke } = setup({ config: {} });
    const result = await invoke({ query: "test" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("authentication");
  });

  it("registers the streaming handoff contract and non-idempotent annotations", () => {
    const { tool } = setup();
    expect(tool.description).toContain("New runs always stream");
    expect(tool.description).toContain("returns its ID");
    expect(tool.annotations).toMatchObject({ readOnlyHint: true, idempotentHint: false });
  });
});
