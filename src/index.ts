#!/usr/bin/env node
process.env.AGNOST_LOG_LEVEL = 'error';

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { log } from "./utils/logger.js";
import { initializeMcpServer } from "./mcp-handler.js";

// Configuration schema for the EXA API key and tool selection
export const configSchema = z.object({
  exaApiKey: z.string().optional().describe("Exa AI API key for search operations"),
  enabledTools: z.union([
    z.array(z.string()),
    z.string()
  ]).optional().describe("List of tools to enable (comma-separated string or array)"),
  tools: z.union([
    z.array(z.string()),
    z.string()
  ]).optional().describe("List of tools to enable (comma-separated string or array) - alias for enabledTools"),
  debug: z.boolean().default(false).describe("Enable debug logging")
});

// Export stateless flag for MCP
export const stateless = true;

/**
 * Exa AI Web Search MCP Server
 * 
 * This MCP server integrates Exa AI's search capabilities with Claude and other MCP-compatible clients.
 * Exa is a search engine and API specifically designed for up-to-date web searching and retrieval,
 * offering more recent and comprehensive results than what might be available in an LLM's training data.
 * 
 * The server provides tools that enable:
 * - Real-time web searching with configurable parameters
 * - Company research and analysis
 * - Web content crawling
 * - People search capabilities
 * - Deep research workflows
 * - And more!
 * 
 * This is the Smithery CLI entry point. For Vercel deployment, see api/mcp.ts
 */

export default function ({ config }: { config: z.infer<typeof configSchema> }) {
  try {
    // Parse and normalize tool selection
    // Support both 'tools' and 'enabledTools' parameters
    // Support both comma-separated strings and arrays
    let parsedEnabledTools: string[] | undefined;
    
    const toolsParam = config.tools || config.enabledTools;
    
    if (toolsParam) {
      if (typeof toolsParam === 'string') {
        // Parse comma-separated string into array
        parsedEnabledTools = toolsParam
          .split(',')
          .map(tool => tool.trim())
          .filter(tool => tool.length > 0);
      } else if (Array.isArray(toolsParam)) {
        parsedEnabledTools = toolsParam;
      }
    }
    
    // Create normalized config with parsed tools
    const normalizedConfig = {
      exaApiKey: config.exaApiKey,
      enabledTools: parsedEnabledTools,
      debug: config.debug
    };
    
    if (config.debug) {
      log("Starting Exa MCP Server (Smithery) in debug mode");
      if (parsedEnabledTools) {
        log(`Enabled tools from config: ${parsedEnabledTools.join(', ')}`);
      }
    }

    // Create MCP server
    const server = new McpServer({
      name: "exa-search-server",
      title: "Exa",
      version: "3.1.8"
    });
    
    log("Server initialized with modern MCP SDK and Smithery CLI support");

    // Initialize server with shared logic
    initializeMcpServer(server, normalizedConfig);
    
    // Return the server object (Smithery CLI handles transport)
    return server.server;
    
  } catch (error) {
    log(`Server initialization error: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
