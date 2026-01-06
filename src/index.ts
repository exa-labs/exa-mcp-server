#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Import agnost for tracking MCP usage
import { trackMCP, createConfig } from 'agnost';

// Import tool implementations
import { registerWebSearchTool } from "./tools/webSearch.js";
import { registerWebSearchAdvancedTool } from "./tools/webSearchAdvanced.js";
import { registerDeepSearchTool } from "./tools/deepSearch.js";
import { registerCompanyResearchTool } from "./tools/companyResearch.js";
import { registerCrawlingTool } from "./tools/crawling.js";
import { registerLinkedInSearchTool } from "./tools/linkedInSearch.js";
import { registerDeepResearchStartTool } from "./tools/deepResearchStart.js";
import { registerDeepResearchCheckTool } from "./tools/deepResearchCheck.js";
import { registerExaCodeTool } from "./tools/exaCode.js";
import { registerFindSimilarTool } from "./tools/findSimilar.js";
import { registerAnswerTool } from "./tools/answer.js";
import { registerCrawlUrlsTool } from "./tools/crawlUrls.js";
import { log } from "./utils/logger.js";

// Configuration schema for the EXA API key and tool selection
export const configSchema = z.object({
  exaApiKey: z.string().optional().describe("Exa AI API key for search operations"),
  // NEW: Self-documenting enabled/disabled pattern (preferred)
  enabled: z.union([
    z.array(z.string()),
    z.string()
  ]).optional().describe("Tools to enable (comma-separated or array). All other tools will be disabled."),
  disabled: z.union([
    z.array(z.string()),
    z.string()
  ]).optional().describe("Tools to disable (comma-separated or array). Only used with 'enabled' param."),
  // LEGACY: Still supported for backwards compatibility
  enabledTools: z.union([
    z.array(z.string()),
    z.string()
  ]).optional().describe("[LEGACY] List of tools to enable (comma-separated string or array)"),
  tools: z.union([
    z.array(z.string()),
    z.string()
  ]).optional().describe("[LEGACY] List of tools to enable (comma-separated string or array) - alias for enabledTools"),
  debug: z.boolean().default(false).describe("Enable debug logging")
});

// Export stateless flag for MCP
export const stateless = true;

// Tool registry for managing available tools
const availableTools = {
  'web_search_exa': { name: 'Web Search (Exa)', description: 'Real-time web search using Exa AI', enabled: true },
  'web_search_advanced': { name: 'Advanced Web Search', description: 'Full API control with category filters, domain restrictions, date ranges, highlights, summaries, and subpage crawling', enabled: false },
  'get_code_context_exa': { name: 'Code Context Search', description: 'Search for code snippets, examples, and documentation from open source repositories', enabled: true },
  'find_similar_exa': { name: 'Find Similar', description: 'Find web pages similar to a given URL', enabled: false },
  'answer_exa': { name: 'Answer (Exa)', description: 'Get direct answers with citations from the web', enabled: false },
  'crawl_urls_exa': { name: 'Crawl URLs', description: 'Crawl and extract content from multiple URLs with advanced options', enabled: false },
  'deep_search_exa': { name: 'Deep Search (Exa)', description: 'Advanced web search with query expansion and high-quality summaries', enabled: false },
  'crawling_exa': { name: 'Web Crawling', description: 'Extract content from specific URLs', enabled: false },
  'deep_researcher_start': { name: 'Deep Researcher Start', description: 'Start a comprehensive AI research task', enabled: false },
  'deep_researcher_check': { name: 'Deep Researcher Check', description: 'Check status and retrieve results of research task', enabled: false },
  'linkedin_search_exa': { name: 'LinkedIn Search', description: 'Search LinkedIn profiles and companies', enabled: false },
  'company_research_exa': { name: 'Company Research', description: 'Research companies and organizations', enabled: false },
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

// Helper to parse comma-separated string or array into string array
function parseToolList(param: string | string[] | undefined): string[] | undefined {
  if (!param) return undefined;
  if (typeof param === 'string') {
    return param.split(',').map(tool => tool.trim()).filter(tool => tool.length > 0);
  }
  return param;
}

// Get all available tool IDs
function getAllToolIds(): string[] {
  return Object.keys(availableTools);
}

export default function ({ config }: { config: z.infer<typeof configSchema> }) {
  try {
    // Parse and normalize tool selection
    // Priority: 'enabled'/'disabled' (NEW) > 'tools'/'enabledTools' (LEGACY) > defaults
    let parsedEnabledTools: string[] | undefined;
    let parsedDisabledTools: string[] | undefined;
    let usingNewPattern = false;

    // Check for NEW pattern: enabled/disabled params
    if (config.enabled) {
      usingNewPattern = true;
      parsedEnabledTools = parseToolList(config.enabled);
      parsedDisabledTools = parseToolList(config.disabled);

      // If only 'enabled' is provided without 'disabled', all other tools are implicitly disabled
      if (!parsedDisabledTools && parsedEnabledTools) {
        parsedDisabledTools = getAllToolIds().filter(id => !parsedEnabledTools!.includes(id));
      }
    } else {
      // LEGACY pattern: tools/enabledTools params
      const toolsParam = config.tools || config.enabledTools;
      parsedEnabledTools = parseToolList(toolsParam);
    }

    // Create normalized config with parsed tools
    const normalizedConfig = {
      ...config,
      enabledTools: parsedEnabledTools
    };

    if (config.debug) {
      log("Starting Exa MCP Server in debug mode");
      if (usingNewPattern) {
        log(`Using NEW enabled/disabled pattern`);
      } else if (parsedEnabledTools) {
        log(`Using LEGACY tools pattern`);
      }
      if (parsedEnabledTools) {
        log(`Enabled tools from config: ${parsedEnabledTools.join(', ')}`);
      }
    }

    // Create MCP server
    const server = new McpServer({
      name: "exa-search-server",
      title: "Exa",
      version: "3.2.0"
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

    if (shouldRegisterTool('web_search_advanced')) {
      registerWebSearchAdvancedTool(server, normalizedConfig);
      registeredTools.push('web_search_advanced');
    }

    if (shouldRegisterTool('find_similar_exa')) {
      registerFindSimilarTool(server, normalizedConfig);
      registeredTools.push('find_similar_exa');
    }

    if (shouldRegisterTool('answer_exa')) {
      registerAnswerTool(server, normalizedConfig);
      registeredTools.push('answer_exa');
    }

    if (shouldRegisterTool('crawl_urls_exa')) {
      registerCrawlUrlsTool(server, normalizedConfig);
      registeredTools.push('crawl_urls_exa');
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
    
    // Compute disabled tools for logging
    const disabledTools = getAllToolIds().filter(id => !registeredTools.includes(id));

    if (normalizedConfig.debug) {
      log(`Registered ${registeredTools.length} tools: ${registeredTools.join(', ')}`);
      if (disabledTools.length > 0) {
        log(`Disabled tools: ${disabledTools.join(', ')}`);
      }
    }

    // Echo full state in startup log (always, not just debug mode)
    log(`Exa MCP loaded - ENABLED: ${registeredTools.join(', ')} | DISABLED: ${disabledTools.join(', ') || 'none'}`);
    if (usingNewPattern) {
      log(`Using self-documenting enabled/disabled URL pattern`);
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
