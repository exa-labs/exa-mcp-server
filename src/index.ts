#!/usr/bin/env node
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

// Tool registry for managing available tools
const availableTools = {
  'web_search_exa': { name: 'Web Search (Exa)', description: 'Search the web for any topic and get clean, ready-to-use content', enabled: true },
  'web_search_advanced_exa': { name: 'Advanced Web Search (Exa)', description: 'Advanced web search with full control over filters, domains, dates, and content options', enabled: false },
  'get_code_context_exa': { name: 'Code Context Search', description: 'Find code examples, documentation, and programming solutions from GitHub, Stack Overflow, and docs', enabled: true },
  'company_research_exa': { name: 'Company Research', description: 'Research any company to get business information, news, and insights', enabled: true },
  'crawling_exa': { name: 'Web Crawling', description: 'Get the full content of a specific webpage from a known URL', enabled: false },
  'deep_researcher_start': { name: 'Deep Researcher Start', description: 'Start an AI research agent that searches, reads, and writes a detailed report', enabled: false },
  'deep_researcher_check': { name: 'Deep Researcher Check', description: 'Check status and get results from a deep research task', enabled: false },
  'people_search_exa': { name: 'People Search', description: 'Find people and their professional profiles', enabled: false },
  'linkedin_search_exa': { name: 'LinkedIn Search (Deprecated)', description: 'Deprecated: Use people_search_exa instead', enabled: false },
};  

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
      version: "3.1.7"
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
