import { trackMCP, createConfig } from 'agnost';
import { z } from "zod";

// Import tool implementations
import { registerWebSearchTool } from "./tools/webSearch.js";
import { registerCompanyResearchTool } from "./tools/companyResearch.js";
import { registerWebFetchTool } from "./tools/webFetch.js";
import { registerPeopleSearchTool } from "./tools/peopleSearch.js";
import { registerLinkedInSearchTool } from "./tools/linkedInSearch.js";
import { registerDeepResearchStartTool } from "./tools/deepResearchStart.js";
import { registerDeepResearchCheckTool } from "./tools/deepResearchCheck.js";
import { registerExaCodeTool } from "./tools/exaCode.js";
import { registerWebSearchAdvancedTool } from "./tools/webSearchAdvanced.js";
import { registerDeepSearchTool } from "./tools/deepSearch.js";
import { registerAgentCreateRunTool } from "./tools/agentCreateRun.js";
import { registerAgentWaitForRunTool } from "./tools/agentWaitForRun.js";
import { registerAgentGetRunOutputTool } from "./tools/agentGetRunOutput.js";
import { registerAgentCancelRunTool } from "./tools/agentCancelRun.js";
import { agentSchemaTemplates } from "./tools/agentSchemaTemplates.js";
import {
  TOOL_REGISTRY,
  isAgentTool,
  listToolMetadata,
  requiresUserProvidedApiKey,
  type ToolId,
} from "./toolRegistry.js";
import { log } from "./utils/logger.js";
import { loadAgentSkillContent } from "./utils/agentSkill.js";

export interface McpConfig {
  exaApiKey?: string;
  enabledTools?: string[];
  debug?: boolean;
  userProvidedApiKey?: boolean;
  exaSource?: string;
  mcpSessionId?: string;
  mcpClient?: unknown;
  defaultSearchType?: 'auto' | 'fast' | 'instant';
  oauthAccessToken?: string;
}

/**
 * Initialize and configure the MCP server with all tools, prompts, and resources.
 * Called by both the Vercel Function (api/mcp.ts) and the stdio entry (src/stdio.ts).
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
    const shouldRegisterTool = (toolId: ToolId): boolean => {
      if (config.enabledTools && config.enabledTools.length > 0) {
        return config.enabledTools.includes(toolId);
      }
      return TOOL_REGISTRY[toolId]?.enabled ?? false;
    };

    const canRegisterTool = (toolId: ToolId): boolean => {
      if (!shouldRegisterTool(toolId)) {
        return false;
      }

      if (requiresUserProvidedApiKey(toolId) && !config.userProvidedApiKey) {
        return false;
      }

      return true;
    };

    // Register tools based on configuration
    const registeredTools: string[] = [];

    if (canRegisterTool('web_search_exa')) {
      registerWebSearchTool(server, config);
      registeredTools.push('web_search_exa');
    }

    if (canRegisterTool('web_search_advanced_exa')) {
      registerWebSearchAdvancedTool(server, config);
      registeredTools.push('web_search_advanced_exa');
    }

    if (canRegisterTool('company_research_exa')) {
      registerCompanyResearchTool(server, config);
      registeredTools.push('company_research_exa');
    }

    if (canRegisterTool('web_fetch_exa')) {
      registerWebFetchTool(server, config);
      registeredTools.push('web_fetch_exa');
    }

    // Deprecated: crawling_exa - kept for backwards compatibility, points to web_fetch_exa
    if (canRegisterTool('crawling_exa')) {
      registerWebFetchTool(server, config, 'crawling_exa');
      registeredTools.push('crawling_exa');
    }

    if (canRegisterTool('people_search_exa')) {
      registerPeopleSearchTool(server, config);
      registeredTools.push('people_search_exa');
    }

    // Deprecated: linkedin_search_exa - kept for backwards compatibility
    if (canRegisterTool('linkedin_search_exa')) {
      registerLinkedInSearchTool(server, config);
      registeredTools.push('linkedin_search_exa');
    }

    if (canRegisterTool('deep_researcher_start')) {
      registerDeepResearchStartTool(server, config);
      registeredTools.push('deep_researcher_start');
    }

    if (canRegisterTool('deep_researcher_check')) {
      registerDeepResearchCheckTool(server, config);
      registeredTools.push('deep_researcher_check');
    }

    if (canRegisterTool('get_code_context_exa')) {
      registerExaCodeTool(server, config);
      registeredTools.push('get_code_context_exa');
    }

    if (canRegisterTool('deep_search_exa')) {
      registerDeepSearchTool(server, config);
      registeredTools.push('deep_search_exa');
    }

    if (canRegisterTool("agent_create_run")) {
      registerAgentCreateRunTool(server, config);
      registeredTools.push("agent_create_run");
    }

    if (canRegisterTool("agent_wait_for_run")) {
      registerAgentWaitForRunTool(server, config);
      registeredTools.push("agent_wait_for_run");
    }

    if (canRegisterTool("agent_get_run_output")) {
      registerAgentGetRunOutputTool(server, config);
      registeredTools.push("agent_get_run_output");
    }

    if (canRegisterTool("agent_cancel_run")) {
      registerAgentCancelRunTool(server, config);
      registeredTools.push("agent_cancel_run");
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

    const registeredAgentTools = registeredTools.filter((toolId) => isAgentTool(toolId as ToolId));

    if (registeredAgentTools.length > 0) {
      const agentSkillContent = loadAgentSkillContent();

      server.prompt(
        "agent_research_help",
        "Get help structuring a multi-step Exa Agent research run.",
        {
          task: z
            .string()
            .optional()
            .describe("The research task to turn into an Exa Agent run"),
        },
        async (args?: { task?: string }) => {
          const task = args?.task?.trim();
          const taskLine = task
            ? `My research task:\n\n${task}`
            : "Help me turn my research task into an Exa Agent run with a clear objective, bounded output schema, coverage plan, and follow-up strategy.";

          return {
            messages: [
              {
                role: "user",
                content: {
                  type: "text",
                  text: `${taskLine}\n\nFollow the Exa Agent research guide below.`,
                },
              },
              {
                role: "user",
                content: {
                  type: "resource",
                  resource: {
                    uri: "exa://agent/skill",
                    mimeType: "text/markdown",
                    text: agentSkillContent,
                  },
                },
              },
            ],
          };
        },
      );
    }

    // Register resources to expose server information
    server.resource(
      "tools_list",
      "exa://tools/list",
      {
        mimeType: "application/json",
        description: "List of available Exa tools and their descriptions"
      },
      async () => {
        return {
          contents: [{
            uri: "exa://tools/list",
            text: JSON.stringify(listToolMetadata(registeredTools), null, 2),
            mimeType: "application/json"
          }]
        };
      }
    );

    if (registeredAgentTools.length > 0) {
      const agentSkillContent = loadAgentSkillContent();

      server.resource(
        "agent_research_guide",
        "exa://agent/skill",
        {
          mimeType: "text/markdown",
          description: "Exa Agent research workflow, schema rules, and coverage guidance",
        },
        async () => ({
          contents: [{
            uri: "exa://agent/skill",
            text: agentSkillContent,
            mimeType: "text/markdown",
          }],
        }),
      );

      server.resource(
        "agent_schema_templates",
        "exa://agent/schema-templates",
        {
          mimeType: "application/json",
          description: "Starter JSON Schema templates for common Agent workflows",
        },
        async () => ({
          contents: [{
            uri: "exa://agent/schema-templates",
            text: JSON.stringify(agentSchemaTemplates, null, 2),
            mimeType: "application/json",
          }],
        }),
      );
    }
    
    // Add Agnost analytics tracking (works with both McpServer and mcp-handler)
    // The server object might be wrapped, so we try to access the underlying server
    const underlyingServer = (server as any).server || server;
    
    try {
      trackMCP(underlyingServer, "f0df908b-3703-40a0-a905-05c907da1ca3", createConfig({
        endpoint: "https://api.agnost.ai",
        disableLogs: true,
        disableInput: true,
        disableOutput: true,
        disableError:false
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
