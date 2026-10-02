import { describe, expect, it, vi } from "vitest";
import type { AgentEvent } from "exa-js";
import {
  AgentProgressBridge,
  createAgentProgressState,
  heartbeatMessage,
  ingestAgentEvent,
  summarizeAgentProgress,
} from "../../../src/tools/agentProgress.js";

function event(name: string, data: Record<string, unknown>): AgentEvent {
  return { event: name, data };
}

describe("agent progress state", () => {
  it("correlates nested tool and source activity to the parent call", () => {
    const state = createAgentProgressState("agent_run_1", 1_000);
    ingestAgentEvent(
      state,
      event("agent_run.output_item.added", {
        item: {
          id: "item_1",
          type: "function_call",
          call_id: "call_parent",
          name: "search",
          status: "in_progress",
        },
      }),
      1_001,
    );
    ingestAgentEvent(
      state,
      event("agent_run.output_item.done", {
        item: {
          id: "item_2",
          type: "function_call",
          call_id: "call_nested",
          parent_call_id: "call_parent",
          name: "search",
          status: "completed",
          metadata: { sourceCount: 2 },
        },
      }),
      1_002,
    );
    ingestAgentEvent(
      state,
      event("agent_run.source.added", {
        source: { url: "https://example.com", callId: "call_parent" },
      }),
      1_003,
    );

    expect(state.sourcesByCallId.get("call_parent")).toBe(1);
    expect(state.toolsByCallId.get("call_parent")).toMatchObject({
      name: "search",
      started: true,
      finished: true,
    });
    expect(state.toolsByCallId.has("call_nested")).toBe(false);
  });

  it("uses native search trace tool names and call IDs", () => {
    const state = createAgentProgressState("agent_run_1", 1_000);
    ingestAgentEvent(
      state,
      event("agent_run.search_trace", {
        tool: "contents",
        callId: "call_contents",
        text: "Reading the relevant pages",
      }),
      1_001,
    );

    expect(state.toolsByCallId.get("call_contents")).toMatchObject({
      name: "contents",
      started: true,
      finished: false,
    });
    expect(state.latestNarrationByCallId.get("call_contents")).toBe("Reading the relevant pages");
  });

  it("ignores unknown events without changing meaningful activity", () => {
    const state = createAgentProgressState("agent_run_1", 1_000);
    const update = ingestAgentEvent(state, event("agent_run.future", { status: "new" }), 2_000);
    expect(update.kind).toBe("ignored");
    expect(state.lastMeaningfulAt).toBe(1_000);
  });

  it("builds bounded aggregate summaries and heartbeat messages", () => {
    const state = createAgentProgressState("agent_run_1", 1_000);
    ingestAgentEvent(
      state,
      event("agent_run.search_trace", {
        tool: "search",
        callId: "call_1",
        text: "Looking for recent funding announcements",
      }),
      2_000,
    );
    for (let i = 0; i < 27; i += 1) {
      ingestAgentEvent(
        state,
        event("agent_run.source.added", {
          source: { url: `https://example.com/${i}`, callId: "call_1" },
        }),
        2_001 + i,
      );
    }

    expect(summarizeAgentProgress(state)).toContain("27 sources");
    expect(summarizeAgentProgress(state).length).toBeLessThanOrEqual(200);
    expect(heartbeatMessage(state, 48_000)).toContain("elapsed 47s");
    expect(heartbeatMessage(state, 48_000)).toContain("Looking for recent funding");
  });
});

describe("AgentProgressBridge", () => {
  it("emits leading and trailing updates for a burst", async () => {
    vi.useFakeTimers();
    try {
      const messages: string[] = [];
      const bridge = new AgentProgressBridge({
        emit: async (message) => {
          messages.push(message);
        },
      });

      await bridge.handle(
        event("agent_run.source.added", {
          source: { url: "https://example.com/1", callId: "call_1" },
        }),
      );
      await bridge.handle(
        event("agent_run.source.added", {
          source: { url: "https://example.com/2", callId: "call_1" },
        }),
      );
      await bridge.handle(
        event("agent_run.source.added", {
          source: { url: "https://example.com/3", callId: "call_1" },
        }),
      );

      expect(messages).toHaveLength(1);
      expect(messages[0]).toContain("1 source");
      await vi.advanceTimersByTimeAsync(1_000);
      expect(messages).toHaveLength(2);
      expect(messages[1]).toContain("3 sources");
      await bridge.cleanup();
    } finally {
      vi.useRealTimers();
    }
  });

  it("flushes coalesced state before an immediate milestone", async () => {
    const messages: string[] = [];
    const bridge = new AgentProgressBridge({
      emit: async (message) => {
        messages.push(message);
      },
      now: (() => {
        let time = 1_000;
        return () => time++;
      })(),
    });

    await bridge.handle(
      event("agent_run.source.added", { source: { url: "https://example.com/1" } }),
    );
    await bridge.handle(event("agent_run.started", { status: "running" }));
    expect(messages).toHaveLength(2);
    expect(messages[0]).toContain("1 source");
    expect(messages[1]).toContain("started");
    await bridge.cleanup();
  });
});
