import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { AgentEvent, AgentRun } from "exa-js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  agentRunInputShape,
  agentRunOutputShape,
  DEFAULT_CALL_WINDOW_MS,
  formatProgressMessage,
  pollAgentRun,
  registerAgentRunTool,
  resolveAgentCallWindowMs,
  streamAgentRun,
  type AgentRunClient,
} from "../../../src/tools/agentRun.js";
import type { AgentRunInput } from "../../../src/types.js";
import { connectInMemory, listAdvertisedTools } from "../../helpers/advertisedTools.js";
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

function setup(
  options: {
    events?: AsyncIterable<AgentEvent>;
    createStream?: AgentRunClient["createStream"];
    getRun?: AgentRunClient["getRun"];
    cancelRun?: AgentRunClient["cancelRun"];
    config?: { exaApiKey?: string; oauthAccessToken?: string };
    callWindowMs?: number;
    heartbeatMs?: number;
    pollIntervalMs?: number;
    progressTimeoutMs?: number;
    progressToken?: string | number;
    signal?: AbortSignal;
    sendNotification?: (notification: Notification) => void | Promise<void>;
    siblingTools?: string[];
  } = {},
) {
  const fake = new FakeMcpServer();
  const createStream = vi.fn(
    options.createStream ?? (async () => options.events ?? streamOf(COMPLETED_EVENTS)),
  );
  const getRun = vi.fn(options.getRun ?? (async () => completedRun()));
  const cancelRun = vi.fn(options.cancelRun ?? (async () => completedRun({ status: "cancelled" })));
  const client: AgentRunClient = { createStream, getRun, cancelRun };

  registerAgentRunTool(fake as unknown as McpServer, options.config ?? { exaApiKey: "test-key" }, {
    clientFactory: () => client,
    callWindowMs: options.callWindowMs,
    heartbeatMs: options.heartbeatMs ?? 10_000,
    pollIntervalMs: options.pollIntervalMs,
    progressTimeoutMs: options.progressTimeoutMs,
    siblingTools: options.siblingTools ?? ["web_search_exa", "web_fetch_exa"],
  });

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
      structuredContent?: Record<string, unknown>;
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

/** agent_run's `outputSchema` as a real McpServer advertises it in tools/list. */
async function advertisedOutputSchema(): Promise<unknown> {
  const [tool] = await listAdvertisedTools((server) =>
    registerAgentRunTool(server, { exaApiKey: "test-key" }),
  );
  return tool.outputSchema;
}

function payload(result: { content: Array<{ text: string }> }): Record<string, unknown> {
  return JSON.parse(result.content[0].text) as Record<string, unknown>;
}

describe("resolveAgentCallWindowMs", () => {
  it("defaults every client to a 45-second window", () => {
    expect(resolveAgentCallWindowMs()).toBe(DEFAULT_CALL_WINDOW_MS);
  });

  it("clamps the default window to a shorter platform ceiling", () => {
    expect(resolveAgentCallWindowMs({ mcpMaxDurationSeconds: 60 })).toBe(10_000);
  });

  it("honors AGENT_CALL_WINDOW_MS above the default window", () => {
    expect(resolveAgentCallWindowMs({ agentCallWindowMs: 300_000 })).toBe(300_000);
  });

  it("caps AGENT_CALL_WINDOW_MS at max duration minus headroom", () => {
    expect(
      resolveAgentCallWindowMs({
        agentCallWindowMs: 900_000,
        mcpMaxDurationSeconds: 800,
      }),
    ).toBe(750_000);
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
    expect(schema.safeParse({ query: "x", dataSources: [{ provider: "unknown" }] }).success).toBe(
      false,
    );
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
    expect(
      formatProgressMessage(event("agent_run.step", { title: "x".repeat(500) }), null).length,
    ).toBeLessThanOrEqual(200);
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
    });
    expect(client.cancelRun).not.toHaveBeenCalled();
  });

  it("cannot hand off a run when the stream has not yielded an ID by the boundary", async () => {
    const client: AgentRunClient = {
      createStream: vi.fn(async () => new Promise<AsyncIterable<AgentEvent>>(() => {})),
      getRun: vi.fn(),
      cancelRun: vi.fn(),
    };

    const outcome = await streamAgentRun({
      client,
      runInput: { query: "test", effort: "low" },
      callWindowMs: 20,
    });

    expect(outcome).toMatchObject({
      status: "unrecoverable_stream",
      runId: null,
      handoffReason: "stream_window_exceeded",
    });
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

  it("returns a resumable handoff when abort races a stream read failure", async () => {
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
    });

    expect(outcome).toMatchObject({
      status: "running",
      runId: "agent_run_1",
    });
    expect(client.cancelRun).not.toHaveBeenCalled();
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

    expect(notifications).toHaveLength(2);
    expect(notifications.map((notification) => notification.method)).toEqual([
      "notifications/progress",
      "notifications/progress",
    ]);
    expect(notifications.map((notification) => notification.params.progress)).toEqual([1, 2]);
    expect(
      notifications.every((notification) => notification.params.progressToken === "progress-1"),
    ).toBe(true);
    expect(notifications.every((notification) => !("total" in notification.params))).toBe(true);
  });

  it("bridges richer events and ignores unknown events until terminal", async () => {
    const { invoke, notifications } = setup({
      progressToken: "progress-1",
      events: streamOf([
        event("agent_run.created", { id: "agent_run_1", status: "queued" }),
        event("agent_run.output_item.added", {
          item: {
            id: "item_1",
            type: "function_call",
            call_id: "call_search",
            name: "search",
            status: "in_progress",
          },
        }),
        event("agent_run.future", { detail: "ignored" }),
        event("agent_run.source.added", {
          source: { url: "https://example.com", callId: "call_search" },
        }),
        event("agent_run.search_trace", {
          tool: "search",
          callId: "call_search",
          text: "Finding relevant results",
        }),
        event("agent_run.completed", completedRun()),
      ]),
    });

    const result = await invoke({ query: "test" });
    expect(result.isError).toBeUndefined();
    expect(notifications.map((notification) => notification.params.message)).toEqual([
      "run agent_run_1 queued",
      expect.stringContaining("1 tool call"),
      expect.stringContaining("Finding relevant results"),
    ]);
    expect(notifications.every((notification) => !("total" in notification.params))).toBe(true);
  });

  it("uses the heartbeat only after meaningful progress becomes idle", async () => {
    vi.useFakeTimers();
    try {
      const controller = new AbortController();
      const pending = setup({
        progressToken: "progress-1",
        signal: controller.signal,
        events: hangingStream([event("agent_run.created", { id: "agent_run_1" })]),
        heartbeatMs: 10,
        callWindowMs: 1_000,
      });
      const resultPromise = pending.invoke({ query: "test" });
      await Promise.resolve();
      expect(
        pending.notifications.some((notification) => {
          const message = notification.params.message;
          return typeof message === "string" && message.includes("still working");
        }),
      ).toBe(false);
      await vi.advanceTimersByTimeAsync(10);
      expect(
        pending.notifications.filter((notification) => {
          const message = notification.params.message;
          return typeof message === "string" && message.includes("still working");
        }),
      ).toHaveLength(1);
      expect(
        pending.notifications.some((notification) => {
          const message = notification.params.message;
          return typeof message === "string" && message.includes("still working");
        }),
      ).toBe(true);
      controller.abort();
      await resultPromise;
    } finally {
      vi.useRealTimers();
    }
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
      message:
        "The Agent run is still active. Call agent_run again with runId=agent_run_1 to continue waiting; do not create a replacement run or cancel it unless the user explicitly requests cancellation.",
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

  it("returns the retained run when the MCP client aborts a streaming create call", async () => {
    const controller = new AbortController();
    const { invoke, cancelRun } = setup({
      events: hangingStream([event("agent_run.created", { id: "agent_run_1" })]),
      signal: controller.signal,
      progressToken: "progress-1",
      sendNotification: () => controller.abort(),
    });

    const result = await invoke({ query: "test" });

    expect(result.isError).toBeUndefined();
    expect(payload(result)).toMatchObject({
      success: true,
      id: "agent_run_1",
      status: "running",
      outputReady: false,
    });
    expect(payload(result).message).toContain("do not create a replacement run or cancel it");
    expect(cancelRun).not.toHaveBeenCalled();
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

  it("errors if the MCP client aborts before a run ID is received", async () => {
    const controller = new AbortController();
    controller.abort();
    const { invoke, cancelRun } = setup({
      signal: controller.signal,
      progressToken: "progress-1",
    });

    const result = await invoke({ query: "test" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("before a run ID was received");
    expect(cancelRun).not.toHaveBeenCalled();
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

  describe("structuredContent", () => {
    const outputSchema = z.object(agentRunOutputShape);

    function expectStructured(result: {
      content: Array<{ text: string }>;
      structuredContent?: Record<string, unknown>;
    }): Record<string, unknown> {
      expect(result.structuredContent).toBeDefined();
      expect(outputSchema.safeParse(result.structuredContent).success).toBe(true);
      expect(result.content[0].text).toBe(JSON.stringify(result.structuredContent));
      expect(result.content[0].text).not.toContain("\n");
      return result.structuredContent ?? {};
    }

    it("registers the MCP outputSchema alongside the input schema", () => {
      const { tool } = setup();
      expect(tool.outputSchema).toBe(agentRunOutputShape);
      expect(tool.inputSchema).toBe(agentRunInputShape);
    });

    it("serializes nullable strings as anyOf branches, not a type array", async () => {
      const json = await advertisedOutputSchema();
      expect(json).toMatchObject({
        properties: {
          stopReason: { anyOf: [{ type: "string" }, { type: "null" }] },
          output: {
            anyOf: [
              { properties: { text: { anyOf: [{ type: "string" }, { type: "null" }] } } },
              { type: "null" },
            ],
          },
        },
      });
    });

    it("emits completed runs with nullable output, extra output fields, and stopReason", async () => {
      const output = {
        text: "done",
        structured: { companies: [{ name: "Exa" }] },
        grounding: [{ field: "companies[0].name", confidence: "high" }],
        files: null,
      };
      const { invoke } = setup({
        events: streamOf([
          event("agent_run.created", { id: "agent_run_1" }),
          event("agent_run.completed", {
            id: "agent_run_1",
            status: "completed",
            output,
            stopReason: "schema_satisfied",
            usage: { searches: 1 },
            costDollars: { total: 0.012 },
          }),
        ]),
      });
      const result = await invoke({ query: "test" });
      expect(result.isError).toBeUndefined();
      expect(expectStructured(result)).toEqual({
        success: true,
        id: "agent_run_1",
        status: "completed",
        outputReady: true,
        output,
        stopReason: "schema_satisfied",
        usage: { searches: 1 },
        costDollars: { total: 0.012 },
      });

      const nullOutput = setup({
        events: streamOf([
          event("agent_run.created", { id: "agent_run_1" }),
          event("agent_run.completed", { id: "agent_run_1", output: null }),
        ]),
      });
      expect(expectStructured(await nullOutput.invoke({ query: "test" }))).toMatchObject({
        status: "completed",
        output: null,
      });
    });

    it("names the run in the error when its result does not match the output schema", async () => {
      const { invoke } = setup({
        events: streamOf([
          event("agent_run.created", { id: "agent_run_1" }),
          event("agent_run.completed", { id: "agent_run_1", output: { text: 42 } }),
        ]),
      });

      const result = await invoke({ query: "test" });

      expect(result.isError).toBe(true);
      expect(result.structuredContent).toBeUndefined();
      expect(result.content[0].text).toContain(
        "agent_run result for agent_run_1 did not match the declared output schema",
      );
    });

    it("emits running handoffs", async () => {
      const { invoke } = setup({
        events: hangingStream([event("agent_run.created", { id: "agent_run_1" })]),
        callWindowMs: 20,
      });
      expect(expectStructured(await invoke({ query: "test" }))).toMatchObject({
        success: true,
        id: "agent_run_1",
        status: "running",
        outputReady: false,
      });
    });

    it("emits cancelled runs", async () => {
      const { invoke } = setup({
        events: streamOf([
          event("agent_run.created", { id: "agent_run_1" }),
          event("agent_run.cancelled", { id: "agent_run_1", stopReason: "cancelled" }),
        ]),
      });
      const result = await invoke({ query: "test" });
      expect(result.isError).toBeUndefined();
      expect(expectStructured(result)).toEqual({
        success: false,
        id: "agent_run_1",
        status: "cancelled",
        outputReady: false,
        stopReason: "cancelled",
      });
    });

    it("emits failed runs as isError with schema-conformant structuredContent", async () => {
      const { invoke } = setup({
        events: streamOf([
          event("agent_run.created", { id: "agent_run_1" }),
          event("agent_run.failed", {
            id: "agent_run_1",
            stopReason: "error",
            error: { message: "bad schema" },
          }),
        ]),
      });
      const result = await invoke({ query: "test" });
      expect(result.isError).toBe(true);
      expect(expectStructured(result)).toEqual({
        success: false,
        id: "agent_run_1",
        status: "failed",
        outputReady: false,
        stopReason: "error",
        error: { message: "bad schema" },
      });
      expect(result.content[1].text).toContain("The Agent run failed");
    });

    it("falls back to a text-only error when the terminal payload has no usable ID", async () => {
      for (const id of [undefined, "", 42]) {
        const { invoke } = setup({
          events: streamOf([event("agent_run.completed", { id, output: null })]),
        });
        const result = await invoke({ query: "test" });
        expect(result.isError).toBe(true);
        expect(result.structuredContent).toBeUndefined();
        expect(result.content[0].text).toContain("without a run ID");
      }
    });

    it("passes the MCP SDK's own output validation for every reportable status", async () => {
      const streams: Record<string, () => AsyncIterable<AgentEvent>> = {
        completed: () => streamOf(COMPLETED_EVENTS),
        running: () => hangingStream([event("agent_run.created", { id: "agent_run_1" })]),
        cancelled: () =>
          streamOf([
            event("agent_run.created", { id: "agent_run_1" }),
            event("agent_run.cancelled", { id: "agent_run_1", stopReason: "cancelled" }),
          ]),
        failed: () =>
          streamOf([
            event("agent_run.created", { id: "agent_run_1" }),
            event("agent_run.failed", { id: "agent_run_1", error: { message: "bad schema" } }),
          ]),
      };

      for (const [status, stream] of Object.entries(streams)) {
        const client = await connectInMemory((server) =>
          registerAgentRunTool(
            server,
            { exaApiKey: "test-key" },
            {
              callWindowMs: 50,
              clientFactory: () => ({
                createStream: async () => stream(),
                getRun: vi.fn(),
                cancelRun: vi.fn(),
              }),
            },
          ),
        );
        try {
          const result = await client.callTool({ name: "agent_run", arguments: { query: "test" } });
          expect(result.structuredContent, status).toMatchObject({ id: "agent_run_1", status });
          expect(result.isError ?? false, status).toBe(status === "failed");
        } finally {
          await client.close();
        }
      }
    });

    it("never emits structuredContent for pre-ID stream failures", async () => {
      const { invoke } = setup({ events: failsBeforeId() });
      const result = await invoke({ query: "test" });
      expect(result.isError).toBe(true);
      expect(result.structuredContent).toBeUndefined();
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
    expect(tool.description).toContain("Long-running: returns a run ID; resume with runId");
    expect(tool.description).toContain("Use it instead of running many searches yourself");
    expect(tool.description).toContain(
      "interrupted tool call is not an explicit cancellation request",
    );
    expect(tool.description).toContain("use web_search_exa");
    expect(tool.description).toContain("use web_fetch_exa");
    expect(tool.annotations).toMatchObject({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    });
  });

  it("only names alternative tools that are registered in the session", () => {
    const searchOnly = setup({ siblingTools: ["web_search_exa"] }).tool.description;
    expect(searchOnly).toContain("use web_search_exa");
    expect(searchOnly).not.toContain("web_fetch_exa");

    const advancedOnly = setup({ siblingTools: ["web_search_advanced_exa"] }).tool.description;
    expect(advancedOnly).toContain("(use web_search_advanced_exa)");
    expect(advancedOnly).not.toContain("use web_search_exa");

    const bothSearch = setup({
      siblingTools: ["web_search_exa", "web_search_advanced_exa"],
    }).tool.description;
    expect(bothSearch).toContain("(use web_search_exa or web_search_advanced_exa)");

    const agentOnly = setup({ siblingTools: [] }).tool.description;
    expect(agentOnly).not.toContain("web_search_exa");
    expect(agentOnly).not.toContain("web_fetch_exa");
    expect(agentOnly).toContain("Not for a single question");
  });
});
