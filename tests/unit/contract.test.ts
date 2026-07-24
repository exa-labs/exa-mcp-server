import { describe, expect, it } from "vitest";
import * as publicApi from "../../src/index.js";
import { initializeMcpServer } from "../../src/index.js";
import { FakeMcpServer } from "../helpers/fakeMcpServer.js";

/**
 * Guards the public library surface embedders rely on: the exported symbols
 * and the default tool registration.
 */
describe("public API contract", () => {
  it("exports the documented library surface", () => {
    expect(Object.keys(publicApi).sort()).toEqual([
      "AGENT_TOOL_IDS",
      "AVAILABLE_TOOL_IDS",
      "AVAILABLE_TOOL_SELECTION_VALUES",
      "DEFAULT_MCP_MAX_DURATION_SECONDS",
      "TOOL_REGISTRY",
      "TOOL_SELECTION_ALIASES",
      "buildConfigFromEnv",
      "expandToolSelection",
      "initializeMcpServer",
      "isAgentTool",
      "isToolEnabledByDefault",
      "listToolMetadata",
      "parsePositiveInteger",
      "registerAgentRunTool",
      "registerWebFetchTool",
      "registerWebSearchAdvancedTool",
      "registerWebSearchTool",
      "requiresUserProvidedApiKey",
      "resolveAgentCallWindowMs",
      "runStdioServer",
    ]);
  });

  it("registers only the default tools with an empty config", () => {
    const server = new FakeMcpServer();
    initializeMcpServer(server, {});

    expect(server.tools.map((tool) => tool.name)).toEqual([
      "web_search_exa",
      "web_fetch_exa",
    ]);
  });
});
