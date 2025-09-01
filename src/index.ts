#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Import tool implementations
import { registerWebSearchTool } from "./tools/webSearch.js";
import { registerCompanyResearchTool } from "./tools/companyResearch.js";
import { registerCrawlingTool } from "./tools/crawling.js";
import { registerLinkedInSearchTool } from "./tools/linkedInSearch.js";
import { registerDeepResearchStartTool } from "./tools/deepResearchStart.js";
import { registerDeepResearchCheckTool } from "./tools/deepResearchCheck.js";
import { log } from "./utils/logger.js";

// Configuration schema for the EXA API key and tool selection
export const configSchema = z.object({
  exaApiKey: z.string().optional().describe("Exa AI API key for search operations"),
  enabledTools: z.array(z.string()).optional().describe("List of tools to enable (if not specified, all tools are enabled)"),
  debug: z.boolean().default(false).describe("Enable debug logging")
});

// Export stateless flag for MCP
export const stateless = true;

// Tool registry for managing available tools
const availableTools = {
  'web_search_exa': { name: 'Web Search (Exa)', description: 'Real-time web search using Exa AI', enabled: true },
  'company_research_exa': { name: 'Company Research', description: 'Research companies and organizations', enabled: true },
  'crawling_exa': { name: 'Web Crawling', description: 'Extract content from specific URLs', enabled: true },
  'linkedin_search_exa': { name: 'LinkedIn Search', description: 'Search LinkedIn profiles and companies', enabled: true },
  'deep_researcher_start': { name: 'Deep Researcher Start', description: 'Start a comprehensive AI research task', enabled: true },
  'deep_researcher_check': { name: 'Deep Researcher Check', description: 'Check status and retrieve results of research task', enabled: true }
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
 * - LinkedIn search capabilities
 * - Deep research workflows
 * - And more!
 */

export default function ({ config }: { config: z.infer<typeof configSchema> }) {
  try {
    // Set the API key in environment for tool functions to use
    // process.env.EXA_API_KEY = config.exaApiKey;
    
    if (config.debug) {
      log("Starting Exa MCP Server in debug mode");
    }

    // Create MCP server
    const server = new McpServer({
      name: "exa-search-server",
      title: "Exa",
      version: "2.0.3"
    });
    
    log("Server initialized with modern MCP SDK and Smithery CLI support");

    // Helper function to check if a tool should be registered
    const shouldRegisterTool = (toolId: string): boolean => {
      if (config.enabledTools && config.enabledTools.length > 0) {
        return config.enabledTools.includes(toolId);
      }
      return availableTools[toolId as keyof typeof availableTools]?.enabled ?? false;
    };

    // Register tools based on configuration
    const registeredTools: string[] = [];
    
    if (shouldRegisterTool('web_search_exa')) {
      registerWebSearchTool(server, config);
      registeredTools.push('web_search_exa');
    }
    
    if (shouldRegisterTool('company_research_exa')) {
      registerCompanyResearchTool(server, config);
      registeredTools.push('company_research_exa');
    }
    
    if (shouldRegisterTool('crawling_exa')) {
      registerCrawlingTool(server, config);
      registeredTools.push('crawling_exa');
    }
    
    if (shouldRegisterTool('linkedin_search_exa')) {
      registerLinkedInSearchTool(server, config);
      registeredTools.push('linkedin_search_exa');
    }
    
    if (shouldRegisterTool('deep_researcher_start')) {
      registerDeepResearchStartTool(server, config);
      registeredTools.push('deep_researcher_start');
    }
    
    if (shouldRegisterTool('deep_researcher_check')) {
      registerDeepResearchCheckTool(server, config);
      registeredTools.push('deep_researcher_check');
    }
    
    if (config.debug) {
      log(`Registered ${registeredTools.length} tools: ${registeredTools.join(', ')}`);
    }
    
    // Return the server object (Smithery CLI handles transport)
    return server.server;
    
  } catch (error) {
    log(`Server initialization error: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
