import { describe, expect, it } from "vitest";
import type { AgentRun } from "../../../src/types.js";
import { waitForRun, type AgentRunReader } from "../../../src/tools/agentWaitForRun.js";

function run(status: AgentRun["status"]): AgentRun {
  return {
    id: "agent_run_test",
    object: "agent_run",
    status,
    stopReason: null,
    createdAt: "2026-06-12T00:00:00.000Z",
    completedAt: status === "completed" ? "2026-06-12T00:00:01.000Z" : null,
    request: {},
    output: {
      text: status === "completed" ? "done" : "",
      structured: status === "completed" ? { items: [] } : null,
      grounding: [],
    },
  };
}

describe("waitForRun", () => {
  it("returns immediately for completed runs", async () => {
    const reader: AgentRunReader = {
      get: async () => run("completed"),
    };

    const result = await waitForRun({
      client: reader,
      runId: "agent_run_test",
      timeoutSeconds: 1,
      pollIntervalMs: 1,
    });

    expect(result.terminal).toBe(true);
    expect(result.timedOut).toBe(false);
    expect(result.run.status).toBe("completed");
  });

  it("reports timedOut when the run is still active at the deadline", async () => {
    const reader: AgentRunReader = {
      get: async () => run("running"),
    };

    const result = await waitForRun({
      client: reader,
      runId: "agent_run_test",
      timeoutSeconds: 0,
      pollIntervalMs: 1,
    });

    expect(result.terminal).toBe(false);
    expect(result.timedOut).toBe(true);
  });
});
