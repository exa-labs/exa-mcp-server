import { z } from "zod";
import axios from "axios";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG } from "./config.js";
import { DeepResearchRequest, DeepResearchStartResponse } from "../types.js";
import { createRequestLogger } from "../utils/logger.js";

export function registerDeepResearchStartTool(server: McpServer, config?: { exaApiKey?: string }): void {
  server.tool(
    "deep_researcher_start",
    "Start a comprehensive AI-powered deep research task for complex queries. This tool initiates an intelligent agent that performs extensive web searches, crawls relevant pages, analyzes information, and synthesizes findings into a detailed research report. The agent thinks critically about the research topic and provides thorough, well-sourced answers. Use this for complex research questions that require in-depth analysis rather than simple searches. After starting a research task, IMMEDIATELY use deep_researcher_check with the returned task ID to monitor progress and retrieve results.",
    {
      instructions: z.string().describe("Complex research question or detailed instructions for the AI researcher. Be specific about what you want to research and any particular aspects you want covered."),
      model: z.enum(['exa-research', 'exa-research-pro']).optional().describe("Research model: 'exa-research' (faster, 15-45s, good for most queries) or 'exa-research-pro' (more comprehensive, 45s-2min, for complex topics). Default: exa-research")
    },
    async ({ instructions, model }) => {
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
            'x-api-key': config?.exaApiKey || process.env.EXA_API_KEY || ''
          },
          timeout: 25000
        });

        const researchRequest: DeepResearchRequest = {
          model: model || 'exa-research',
          instructions,
          output: {
            inferSchema: false
          }
        };
        
        logger.log(`Starting research with model: ${researchRequest.model}`);
        
        const response = await axiosInstance.post<DeepResearchStartResponse>(
          API_CONFIG.ENDPOINTS.RESEARCH_TASKS,
          researchRequest,
          { timeout: 25000 }
        );
        
        logger.log(`Research task started with ID: ${response.data.id}`);

        if (!response.data || !response.data.id) {
          logger.log("Warning: Empty or invalid response from Exa Research API");
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
              taskId: response.data.id,
              model: researchRequest.model,
              instructions: instructions,
              outputSchema: response.data.outputSchema,
              message: `Deep research task started successfully with ${researchRequest.model} model. IMMEDIATELY use deep_researcher_check with task ID '${response.data.id}' to monitor progress. Keep checking every few seconds until status is 'completed' to get the research results.`,
              nextStep: `Call deep_researcher_check with taskId: "${response.data.id}"`
            }, null, 2)
          }]
        };
        
        logger.complete();
        return result;
      } catch (error) {
        logger.error(error);
        
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