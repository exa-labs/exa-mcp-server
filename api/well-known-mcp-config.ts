/**
 * JSON Schema at /.well-known/mcp-config for URL query configuration.
 */

import { AVAILABLE_TOOL_SELECTION_VALUES } from "../src/toolRegistry.js";

const configSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: "/.well-known/mcp-config",
  title: "Exa MCP Server Configuration",
  description: "URL query options for the hosted Exa MCP server",
  "x-query-style": "dot+bracket",
  type: "object",
  properties: {
    exaApiKey: {
      type: "string",
      title: "Exa API Key",
      description:
        "Optional API key (https://dashboard.exa.ai/api-keys). Hosted MCP also supports OAuth.",
    },
    tools: {
      type: "string",
      title: "Enabled Tools",
      description:
        "Comma-separated tools. When set, replaces defaults (web_search_exa, web_fetch_exa). agent_run requires OAuth or an API key.",
      examples: [
        "web_search_advanced_exa",
        "web_search_exa,web_fetch_exa,agent_run",
        "agent_tools",
      ],
      "x-available-values": AVAILABLE_TOOL_SELECTION_VALUES,
    },
    debug: {
      type: "boolean",
      title: "Debug Mode",
      description: "Enable debug logging",
      default: false,
    },
  },
  additionalProperties: false,
};

export function GET(): Response {
  return new Response(JSON.stringify(configSchema, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export function OPTIONS(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
