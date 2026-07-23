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

/**
 * Render a zod param schema as a stable type descriptor. Enum values are spelled
 * out so accepted input values (e.g. the search `category` list) are part of the
 * snapshotted contract, not just the param names.
 */
function describeZodParam(schema: unknown): string {
  let current: any = schema;
  for (let depth = 0; depth < 10 && current?._def; depth += 1) {
    const def = current._def;
    if (def.innerType) {
      current = def.innerType; // ZodOptional / ZodDefault / ZodNullable / ZodCatch
      continue;
    }
    if (def.schema) {
      current = def.schema; // ZodEffects (preprocess/refine)
      continue;
    }
    break;
  }

  const def = current?._def;
  if (def?.typeName === "ZodEnum" && Array.isArray(def.values)) {
    return `enum(${def.values.join("|")})`;
  }
  return typeof def?.typeName === "string" ? def.typeName : "unknown";
}

function describeParams(inputSchema: unknown): string[] {
  return Object.entries((inputSchema ?? {}) as Record<string, unknown>)
    .map(([key, schema]) => `${key}: ${describeZodParam(schema)}`)
    .sort();
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
        params: describeParams(tool.inputSchema),
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
