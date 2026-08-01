import { describe, expect, it, vi } from "vitest";
import type { AgentEvent } from "exa-js";
import {
  AgentProgressBridge,
  createAgentProgressState,
  heartbeatMessage,
  ingestAgentEvent,
  summarizeAgentProgress,
} from "../../../src/tools/agentProgress.js";

function event(name: string, data: Record<string, unknown> = {}): AgentEvent {
  return { event: name, data };
}

describe("agent progress state", () => {
  it("tracks meaningful events for heartbeats", () => {
    const state = createAgentProgressState(null, 1_000);
    ingestAgentEvent(state, event("agent_run.created", { id: "agent_run_1" }), 1_100);
    ingestAgentEvent(
      state,
      event("agent_run.source.added", { source: { url: "https://example.com" } }),
      1_200,
    );

    expect(state.runId).toBe("agent_run_1");
    expect(summarizeAgentProgress(state)).toContain("1 source");
    expect(heartbeatMessage(state, 3_200)).toContain("elapsed 2s");
  });
});

describe("AgentProgressBridge", () => {
  it("coalesces rapid activity and flushes the latest state on cleanup", async () => {
    const emit = vi.fn(async () => {});
    const bridge = new AgentProgressBridge({ emit, throttleMs: 1_000, now: () => 1_000 });

    await bridge.handle(event("agent_run.created", { id: "agent_run_1" }));
    await bridge.handle(event("agent_run.search_trace", { text: "Searching" }));
    await bridge.cleanup();

    expect(emit).toHaveBeenCalledTimes(2);
    expect((emit.mock.calls as unknown[][])[1]?.[0]).toContain("Searching");
  });
});
