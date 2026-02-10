import { z } from "zod";
import axios from "axios";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG } from "./config.js";
import { DeepResearchRequest, DeepResearchStartResponse } from "../types.js";
import { createRequestLogger } from "../utils/logger.js";
import { handleRateLimitError } from "../utils/errorHandler.js";
import { checkpoint } from "agnost";

export function registerDeepResearchStartTool(server: McpServer, config?: { exaApiKey?: string; userProvidedApiKey?: boolean }): void {
  server.tool(
    "deep_researcher_start",
    `Start an AI research agent that searches, reads, and writes a detailed report. Takes 15 seconds to 2 minutes.

Best for: Complex research questions needing deep analysis and synthesis.
Returns: Research ID - use deep_researcher_check to get results.
Important: Call deep_researcher_check with the returned research ID to get the report.`,
    {
      instructions: z.string().describe("Complex research question or detailed instructions for the AI researcher. Be specific about what you want to research and any particular aspects you want covered."),
      model: z.enum(['exa-research-fast', 'exa-research', 'exa-research-pro']).optional().describe("Research model: 'exa-research-fast' (fastest, ~15s, good for simple queries), 'exa-research' (balanced, 15-45s, good for most queries), or 'exa-research-pro' (most comprehensive, 45s-3min, for complex topics). Default: exa-research-fast"),
      outputSchema: z.record(z.unknown()).optional().describe("Optional JSON Schema for structured output. When provided, the research report will include a 'parsed' field with data matching this schema.")
    },
    async ({ instructions, model, outputSchema }) => {
      const requestId = `deep_researcher_start-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'deep_researcher_start');
      
      logger.start(instructions);
      
      try {
        // Create a fresh axios instance for each request
        const axiosInstance = axios.create({
          baseURL: API_CONFIG.BASE_URL,
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'x-api-key': config?.exaApiKey || process.env.EXA_API_KEY || '',
            'x-exa-integration': 'deep-research-mcp'
          },
          timeout: 25000
        });

        const researchRequest: DeepResearchRequest = {
          model: model || 'exa-research-fast',
          instructions,
          ...(outputSchema && { outputSchema })
        };
        
        checkpoint('deep_research_start_request_prepared', {
          model: researchRequest.model
        });
        logger.log(`Starting research with model: ${researchRequest.model}`);
        
        const response = await axiosInstance.post<DeepResearchStartResponse>(
          API_CONFIG.ENDPOINTS.RESEARCH,
          researchRequest,
          { timeout: 25000 }
        );
        
        checkpoint('deep_research_start_response_received');
        logger.log(`Research task started with ID: ${response.data.researchId}`);

        if (!response.data || !response.data.researchId) {
          logger.log("Warning: Empty or invalid response from Exa Research API");
          checkpoint('deep_research_start_complete');
          return {
            content: [{
              type: "text" as const,
              text: "Failed to start research task. Please try again."
            }],
            isError: true,
          };
        }

        const result = {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              success: true,
              researchId: response.data.researchId,
              model: researchRequest.model,
              instructions: instructions,
              message: `Deep research task started successfully with ${researchRequest.model} model. IMMEDIATELY use deep_researcher_check with research ID '${response.data.researchId}' to monitor progress. Keep checking every few seconds until status is 'completed' to get the research results.`,
              nextStep: `Call deep_researcher_check with researchId: "${response.data.researchId}"`
            }, null, 2)
          }]
        };
        
        checkpoint('deep_research_start_complete');
        logger.complete();
        return result;
      } catch (error) {
        logger.error(error);
        
        // Check for rate limit error on free MCP
        const rateLimitResult = handleRateLimitError(error, config?.userProvidedApiKey, 'deep_researcher_start');
        if (rateLimitResult) {
          return rateLimitResult;
        }
        
        if (axios.isAxiosError(error)) {
          // Handle Axios errors specifically
          const statusCode = error.response?.status || 'unknown';
          const errorMessage = error.response?.data?.message || error.message;
          
          logger.log(`Axios error (${statusCode}): ${errorMessage}`);
          return {
            content: [{
              type: "text" as const,
              text: `Research start error (${statusCode}): ${errorMessage}`
            }],
            isError: true,
          };
        }
        
        // Handle generic errors
        return {
          content: [{
            type: "text" as const,
            text: `Research start error: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true,
        };
      }
    }
  );
}                                                                                                                                                                                                                                                                                                