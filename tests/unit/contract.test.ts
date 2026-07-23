import { describe, expect, it } from "vitest";
import * as publicApi from "../../src/index.js";
import { AVAILABLE_TOOL_IDS, initializeMcpServer, type McpConfig } from "../../src/index.js";
import { FakeMcpServer } from "../helpers/fakeMcpServer.js";

/**
 * Contract tests for the public library surface.
 *
 * Servers that wrap this package (including Exa's hosted deployment) depend on
 * the exported symbols and on the registered tool names, input schemas,
 * descriptions, and annotations. A snapshot change here is a contract change:
 * additive ones ship as minor versions, breaking ones as majors.
 */

function initializeSurface(config: McpConfig): FakeMcpServer {
  const server = new FakeMcpServer();
  initializeMcpServer(server, config);
  return server;
}

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
    const server = initializeSurface({});

    expect(server.tools.map((tool) => tool.name)).toEqual([
      "web_search_exa",
      "web_fetch_exa",
    ]);
  });

  it("matches the registered tool, prompt, and resource surface with every tool enabled", () => {
    const server = initializeSurface({
      enabledTools: [...AVAILABLE_TOOL_IDS],
      userProvidedApiKey: true,
    });

    const surface = {
      tools: server.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        params: Object.keys((tool.inputSchema ?? {}) as Record<string, unknown>).sort(),
        annotations: tool.annotations,
      })),
      prompts: server.prompts.map((prompt) => prompt.name),
      resources: server.resources.map((resource) => ({
        name: resource.name,
        uri: resource.uri,
      })),
    };

    expect(surface).toMatchSnapshot();
  });
});
