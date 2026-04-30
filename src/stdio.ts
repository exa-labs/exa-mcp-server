process.env.AGNOST_LOG_LEVEL = process.env.AGNOST_LOG_LEVEL ?? "error";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { initializeMcpServer, type McpConfig } from "./mcp-handler.js";
import { log } from "./utils/logger.js";

// Reads EXA_API_KEY, ENABLED_TOOLS / TOOLS, DEBUG, DEFAULT_SEARCH_TYPE from env.
// HTTP/Vercel entry point lives in api/mcp.ts; CLI bootstrap lives in src/stdio-cli.ts.

function parseTools(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  const tools = value
    .split(",")
    .map(tool => tool.trim())
    .filter(tool => tool.length > 0);
  return tools.length > 0 ? tools : undefined;
}

function parseSearchType(value: string | undefined): "auto" | "fast" | undefined {
  if (value === "auto" || value === "fast") return value;
  return undefined;
}

export function buildConfigFromEnv(env: NodeJS.ProcessEnv = process.env): McpConfig {
  const exaApiKey = env.EXA_API_KEY;
  return {
    exaApiKey,
    enabledTools: parseTools(env.ENABLED_TOOLS ?? env.TOOLS),
    debug: env.DEBUG === "true",
    defaultSearchType: parseSearchType(env.DEFAULT_SEARCH_TYPE),
    userProvidedApiKey: Boolean(exaApiKey),
  };
}

export async function main(env: NodeJS.ProcessEnv = process.env): Promise<void> {
  const config = buildConfigFromEnv(env);

  const server = new McpServer({
    name: "exa-search-server",
    title: "Exa",
    version: "3.2.1"
  });

  initializeMcpServer(server, config);

  if (config.debug) {
    log("Starting Exa MCP Server (stdio) in debug mode");
    if (config.enabledTools) {
      log(`Enabled tools from env: ${config.enabledTools.join(", ")}`);
    }
  }

  await server.connect(new StdioServerTransport());
}
