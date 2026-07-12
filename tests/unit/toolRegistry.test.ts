import { describe, expect, it } from "vitest";
import {
  AGENT_TOOL_IDS,
  AVAILABLE_TOOL_IDS,
  expandToolSelection,
  isAgentTool,
  isToolEnabledByDefault,
  listToolMetadata,
  requiresUserProvidedApiKey,
} from "../../src/toolRegistry.js";

describe("isToolEnabledByDefault", () => {
  it("reflects each tool's enabled flag", () => {
    expect(isToolEnabledByDefault("web_search_exa")).toBe(true);
    expect(isToolEnabledByDefault("web_fetch_exa")).toBe(true);
    expect(isToolEnabledByDefault("web_search_advanced_exa")).toBe(false);
    expect(isToolEnabledByDefault("agent_create_run")).toBe(false);
  });
});

describe("requiresUserProvidedApiKey", () => {
  it("is true only for tools that declare the flag", () => {
    expect(requiresUserProvidedApiKey("deep_researcher_start")).toBe(true);
    expect(requiresUserProvidedApiKey("agent_create_run")).toBe(true);
  });

  it("is false when the flag is absent", () => {
    expect(requiresUserProvidedApiKey("web_search_exa")).toBe(false);
    expect(requiresUserProvidedApiKey("web_fetch_exa")).toBe(false);
  });
});

describe("isAgentTool", () => {
  it("is true for the agent group and false otherwise", () => {
    expect(isAgentTool("agent_create_run")).toBe(true);
    expect(isAgentTool("agent_cancel_run")).toBe(true);
    expect(isAgentTool("web_search_exa")).toBe(false);
  });

  it("agrees with AGENT_TOOL_IDS across the whole registry", () => {
    for (const toolId of AVAILABLE_TOOL_IDS) {
      expect(isAgentTool(toolId)).toBe(AGENT_TOOL_IDS.includes(toolId));
    }
  });
});

describe("expandToolSelection", () => {
  it("expands the agent_tools alias to every agent tool id", () => {
    expect(expandToolSelection(["agent_tools"])).toEqual(AGENT_TOOL_IDS);
  });

  it("deduplicates repeated ids and preserves first-seen order", () => {
    expect(
      expandToolSelection(["web_fetch_exa", "web_search_exa", "web_fetch_exa"]),
    ).toEqual(["web_fetch_exa", "web_search_exa"]);
  });

  it("deduplicates across an alias and an explicit member of it", () => {
    // agent_create_run is already included via the alias, so it is not repeated.
    expect(expandToolSelection(["agent_tools", "agent_create_run"])).toEqual(
      AGENT_TOOL_IDS,
    );
  });

  it("silently skips ids that are not in the registry", () => {
    expect(
      expandToolSelection(["not_a_real_tool", "web_search_exa"]),
    ).toEqual(["web_search_exa"]);
    expect(expandToolSelection(["definitely_unknown"])).toEqual([]);
  });
});

describe("listToolMetadata", () => {
  it("marks only the registered tools as enabled and covers the whole registry", () => {
    const metadata = listToolMetadata(["web_search_exa"]);

    expect(metadata).toHaveLength(AVAILABLE_TOOL_IDS.length);

    const bySelected = metadata.find((m) => m.id === "web_search_exa");
    const byOther = metadata.find((m) => m.id === "web_fetch_exa");
    expect(bySelected?.enabled).toBe(true);
    expect(byOther?.enabled).toBe(false);

    // Name/description are surfaced from the registry for every entry.
    for (const entry of metadata) {
      expect(entry.name).toBeTruthy();
      expect(entry.description).toBeTruthy();
    }
  });
});
