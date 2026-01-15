import { z } from "zod";
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

// Tool registry for managing available tools
const availableTools = {
  'web_search_exa': { name: 'Web Search (Exa)', description: 'Real-time web search using Exa AI', enabled: true },
  'get_code_context_exa': { name: 'Code Context Search', description: 'Search for code snippets, examples, and documentation from open source repositories', enabled: true },
  'deep_search_exa': { name: 'Deep Search (Exa)', description: 'Advanced web search with query expansion and high-quality summaries', enabled: false },
  'crawling_exa': { name: 'Web Crawling', description: 'Extract content from specific URLs', enabled: false },
  'deep_researcher_start': { name: 'Deep Researcher Start', description: 'Start a comprehensive AI research task', enabled: false },
  'deep_researcher_check': { name: 'Deep Researcher Check', description: 'Check status and retrieve results of research task', enabled: false },
  'linkedin_search_exa': { name: 'LinkedIn Search', description: 'Search LinkedIn profiles and companies', enabled: false },
  'company_research_exa': { name: 'Company Research', description: 'Research companies and organizations', enabled: false },
};

export interface McpConfig {
  exaApiKey?: string;
  enabledTools?: string[];
  debug?: boolean;
}

/**
 * Initialize and configure the MCP server with all tools, prompts, and resources
 * This function is called by both Vercel Functions and Smithery transports
 * 
 * @param server - The MCP server instance (can be from McpServer or mcp-handler)
 * @param config - Configuration object with API key and tool settings
 */
export function initializeMcpServer(server: any, config: McpConfig = {}) {
  try {
    if (config.debug) {
      log("Initializing Exa MCP Server in debug mode");
      if (config.enabledTools) {
        log(`Enabled tools from config: ${config.enabledTools.join(', ')}`);
      }
    }

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
    
    if (shouldRegisterTool('deep_search_exa')) {
      registerDeepSearchTool(server, config);
      registeredTools.push('deep_search_exa');
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
    
    if (shouldRegisterTool('get_code_context_exa')) {
      registerExaCodeTool(server, config);
      registeredTools.push('get_code_context_exa');
    }
    
    if (config.debug) {
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
    
    // Add Agnost analytics tracking (works with both McpServer and mcp-handler)
    // The server object might be wrapped, so we try to access the underlying server
    const underlyingServer = (server as any).server || server;
    
    try {
      trackMCP(underlyingServer, "f0df908b-3703-40a0-a905-05c907da1ca3", createConfig({
        endpoint: "https://api.agnost.ai"
      }));
      
      if (config.debug) {
        log("Agnost analytics tracking enabled");
      }
    } catch (analyticsError) {
      // Log but don't fail if analytics setup fails
      if (config.debug) {
        log(`Analytics tracking setup failed (non-critical): ${analyticsError}`);
      }
    }
    
    if (config.debug) {
      log("MCP server initialization complete");
    }
    
  } catch (error) {
    log(`Server initialization error: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

