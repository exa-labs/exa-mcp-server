import { describe, expect, it } from "vitest";
import { expandToolSelection } from "../../src/toolRegistry.js";

describe("Agent tool selection compatibility", () => {
  it("expands agent_tools to the single agent_run tool", () => {
    expect(expandToolSelection(["agent_tools"])).toEqual(["agent_run"]);
  });

  it("maps every legacy Agent selection to agent_run", () => {
    for (const selection of [
      "agent_create_run",
      "agent_run_stream",
      "agent_wait_for_run",
      "agent_get_run_output",
      "agent_cancel_run",
    ]) {
      expect(expandToolSelection([selection])).toEqual(["agent_run"]);
    }
  });

  it("deduplicates aliases and the canonical name", () => {
    expect(expandToolSelection(["agent_tools", "agent_run_stream", "agent_run"])).toEqual([
      "agent_run",
    ]);
  });
});
