import { describe, expect, it } from "vitest";
import { expandToolSelection } from "../../src/toolRegistry.js";

describe("Tool selection", () => {
  it("expands agent_tools to the single agent_run tool", () => {
    expect(expandToolSelection(["agent_tools"])).toEqual(["agent_run"]);
  });

  it("ignores removed tool names", () => {
    expect(expandToolSelection(["deep_search_exa", "crawling_exa"])).toEqual([]);
  });

  it("deduplicates aliases and the canonical name", () => {
    expect(expandToolSelection(["agent_tools", "agent_run"])).toEqual(["agent_run"]);
  });
});
