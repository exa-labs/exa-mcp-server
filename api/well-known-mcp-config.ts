/**
 * Well-known endpoint for MCP configuration schema
 * 
 * Exposes a JSON Schema at /.well-known/mcp-config for Smithery and other MCP clients
 * to discover available configuration options. This enables configuration forms in
 * Smithery's UI and allows clients to pass configuration via URL parameters.
 */

const AVAILABLE_TOOLS = [
  'web_search_exa',
  'web_search_advanced_exa',
  'get_code_context_exa',
  'crawling_exa',
  'deep_researcher_start',
  'deep_researcher_check',
  'people_search_exa',
  'linkedin_search_exa', // Deprecated: use people_search_exa
  'company_research_exa',
];

const configSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "/.well-known/mcp-config",
  "title": "Exa MCP Server Configuration",
  "description": "Configuration for connecting to the Exa MCP server",
  "x-query-style": "dot+bracket",
  "type": "object",
  "properties": {
    "exaApiKey": {
      "type": "string",
      "title": "Exa API Key",
      "description": "Your Exa AI API key for search operations (optional - server has a fallback key). Get one at https://exa.ai"
    },
    "tools": {
      "type": "string",
      "title": "Enabled Tools",
      "description": "Comma-separated list of tools to enable. Leave empty for defaults (web_search_exa, get_code_context_exa).",
      "examples": [
        "web_search_exa,crawling_exa",
        "web_search_exa,crawling_exa,company_research_exa"
      ],
      "x-available-values": AVAILABLE_TOOLS
    },
    "debug": {
      "type": "boolean",
      "title": "Debug Mode",
      "description": "Enable debug logging for troubleshooting",
      "default": false
    }
  },
  "additionalProperties": false
};

export function GET(): Response {
  return new Response(JSON.stringify(configSchema, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}

export function OPTIONS(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
