#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Import agnost for tracking MCP usage
import { trackMCP, createConfig } from 'agnost';

// Import tool implementations
import { registerWebSearchTool } from "./tools/webSearch.js";
import { registerDeepSearchTool } from "./tools/deepSearch.js";
import { registerCompanyResearchTool } from "./tools/companyResearch.js";
import { registerCrawlingTool } from "./tools/crawling.js";
import { registerLinkedInSearchTool } from "./tools/linkedInSearch.js";
import { registerDeepResearchStartTool } from "./tools/deepResearchStart.js";
import { registerDeepResearchCheckTool } from "./tools/deepResearchCheck.js";
import { registerExaCodeTool } from "./tools/exaCode.js";
import { log } from "./utils/logger.js";

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
  'web_search_exa': { name: 'Web Search (Exa)', description: 'Real-time web search using Exa AI', enabled: true },
  'get_code_context_exa': { name: 'Code Context Search', description: 'Search for code snippets, examples, and documentation from open source repositories', enabled: true },
  'deep_search_exa': { name: 'Deep Search (Exa)', description: 'Advanced web search with query expansion and high-quality summaries', enabled: false },
  'crawling_exa': { name: 'Web Crawling', description: 'Extract content from specific URLs', enabled: false },
  'deep_researcher_start': { name: 'Deep Researcher Start', description: 'Start a comprehensive AI research task', enabled: false },
  'deep_researcher_check': { name: 'Deep Researcher Check', description: 'Check status and retrieve results of research task', enabled: false },
  'linkedin_search_exa': { name: 'LinkedIn Search', description: 'Search LinkedIn profiles and companies', enabled: false },
  'company_research_exa': { name: 'Company Research', description: 'Research companies and organizations', enabled: true },
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
      ...config,
      enabledTools: parsedEnabledTools
    };
    
    if (config.debug) {
      log("Starting Exa MCP Server in debug mode");
      if (parsedEnabledTools) {
        log(`Enabled tools from config: ${parsedEnabledTools.join(', ')}`);
      }
    }

    // Create MCP server
    const server = new McpServer({
      name: "exa-search-server",
      title: "Exa",
      version: "3.1.3"
    });
    
    log("Server initialized with modern MCP SDK and Smithery CLI support");

    // Helper function to check if a tool should be registered
    const shouldRegisterTool = (toolId: string): boolean => {
      if (normalizedConfig.enabledTools && normalizedConfig.enabledTools.length > 0) {
        return normalizedConfig.enabledTools.includes(toolId);
      }
      return availableTools[toolId as keyof typeof availableTools]?.enabled ?? false;
    };

    // Register tools based on configuration
    const registeredTools: string[] = [];
    
    if (shouldRegisterTool('web_search_exa')) {
      registerWebSearchTool(server, normalizedConfig);
      registeredTools.push('web_search_exa');
    }
    
    if (shouldRegisterTool('deep_search_exa')) {
      registerDeepSearchTool(server, normalizedConfig);
      registeredTools.push('deep_search_exa');
    }
    
    if (shouldRegisterTool('company_research_exa')) {
      registerCompanyResearchTool(server, normalizedConfig);
      registeredTools.push('company_research_exa');
    }
    
    if (shouldRegisterTool('crawling_exa')) {
      registerCrawlingTool(server, normalizedConfig);
      registeredTools.push('crawling_exa');
    }
    
    if (shouldRegisterTool('linkedin_search_exa')) {
      registerLinkedInSearchTool(server, normalizedConfig);
      registeredTools.push('linkedin_search_exa');
    }
    
    if (shouldRegisterTool('deep_researcher_start')) {
      registerDeepResearchStartTool(server, normalizedConfig);
      registeredTools.push('deep_researcher_start');
    }
    
    if (shouldRegisterTool('deep_researcher_check')) {
      registerDeepResearchCheckTool(server, normalizedConfig);
      registeredTools.push('deep_researcher_check');
    }
    
    if (shouldRegisterTool('get_code_context_exa')) {
      registerExaCodeTool(server, normalizedConfig);
      registeredTools.push('get_code_context_exa');
    }
    
    if (normalizedConfig.debug) {
      log(`Registered ${registeredTools.length} tools: ${registeredTools.join(', ')}`);
    }
    
    // Register prompts to help users get started
    server.prompt(
      "web_search_help",
      "Get help with web search using Exa",
      {},
      async () => {
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: "I want to search the web for current information. Can you help me search for recent news about artificial intelligence breakthroughs?"
              }
            }
          ]
        };
      }
    );

    server.prompt(
      "code_search_help",
      "Get help finding code examples and documentation",
      {},
      async () => {
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: "I need help with a programming task. Can you search for examples of how to use React hooks for state management?"
              }
            }
          ]
        };
      }
    );
    
    // Register resources to expose server information
    server.resource(
      "tools_list",
      "exa://tools/list",
      {
        mimeType: "application/json",
        description: "List of available Exa tools and their descriptions"
      },
      async () => {
        const toolsList = Object.entries(availableTools).map(([id, tool]) => ({
          id,
          name: tool.name,
          description: tool.description,
          enabled: registeredTools.includes(id)
        }));
        
        return {
          contents: [{
            uri: "exa://tools/list",
            text: JSON.stringify(toolsList, null, 2),
            mimeType: "application/json"
          }]
        };
      }
    );
    
    // Add Agnost analytics tracking
    trackMCP(server.server, "f0df908b-3703-40a0-a905-05c907da1ca3", createConfig({
      endpoint: "https://api.agnost.ai"
    }));
    
    if (config.debug) {
      log("Agnost analytics tracking enabled");
    }
    
    // Return the server object (Smithery CLI handles transport)
    return server.server;
    
  } catch (error) {
    log(`Server initialization error: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
