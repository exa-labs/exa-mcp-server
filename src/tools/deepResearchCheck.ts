import { z } from "zod";
import axios from "axios";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG } from "./config.js";
import { DeepResearchCheckResponse, DeepResearchErrorResponse } from "../types.js";
import { createRequestLogger } from "../utils/logger.js";
import { handleRateLimitError } from "../utils/errorHandler.js";
import { checkpoint } from "agnost";

// Helper function to create a delay
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function registerDeepResearchCheckTool(server: McpServer, config?: { exaApiKey?: string; userProvidedApiKey?: boolean }): void {
  server.tool(
    "deep_researcher_check",
    `Check status and get results from a deep research task.

Best for: Getting the research report after calling deep_researcher_start.
Returns: Research report when complete, or status update if still running.
Important: Keep calling with the same research ID until status is 'completed'.`,
    {
      researchId: z.string().describe("The research ID returned from deep_researcher_start tool")
    },
    async ({ researchId }) => {
      const requestId = `deep_researcher_check-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'deep_researcher_check');
      
      logger.start(researchId);
      
      try {
        // Built-in delay to allow processing time
        logger.log("Waiting 5 seconds before checking status...");
        await delay(5000);
        checkpoint('deep_research_check_delay_complete');

        // Create a fresh axios instance for each request
        const axiosInstance = axios.create({
          baseURL: API_CONFIG.BASE_URL,
          headers: {
            'accept': 'application/json',
            'x-api-key': config?.exaApiKey || process.env.EXA_API_KEY || '',
            'x-exa-integration': 'deep-research-mcp'
          },
          timeout: 25000
        });

        logger.log(`Checking status for research: ${researchId}`);
        
        checkpoint('deep_research_check_request_prepared');
        const response = await axiosInstance.get<DeepResearchCheckResponse>(
          `${API_CONFIG.ENDPOINTS.RESEARCH}/${researchId}`,
          { timeout: 25000 }
        );
        
        checkpoint('deep_research_check_response_received');
        logger.log(`Task status: ${response.data.status}`);

        if (!response.data) {
          logger.log("Warning: Empty response from Exa Research API");
          checkpoint('deep_research_check_complete');
          return {
            content: [{
              type: "text" as const,
              text: "Failed to check research task status. Please try again."
            }],
            isError: true,
          };
        }

        // Format the response based on status
        let resultText: string;
        
        if (response.data.status === 'completed') {
          resultText = JSON.stringify({
            success: true,
            status: response.data.status,
            researchId: response.data.researchId,
            report: response.data.output?.content || "No report generated",
            parsedOutput: response.data.output?.parsed,
            citations: response.data.citations,
            model: response.data.model,
            costDollars: response.data.costDollars,
            message: "Deep research completed! Here's your comprehensive research report."
          }, null, 2);
          logger.log("Research completed successfully");
        } else if (response.data.status === 'running' || response.data.status === 'pending') {
          resultText = JSON.stringify({
            success: true,
            status: response.data.status,
            researchId: response.data.researchId,
            message: "Research in progress. Continue polling...",
            nextAction: "Call deep_researcher_check again with the same research ID"
          }, null, 2);
          logger.log("Research still in progress");
        } else if (response.data.status === 'failed') {
          resultText = JSON.stringify({
            success: false,
            status: response.data.status,
            researchId: response.data.researchId,
            createdAt: new Date(response.data.createdAt).toISOString(),
            instructions: response.data.instructions,
            message: "Deep research task failed. Please try starting a new research task with different instructions."
          }, null, 2);
          logger.log("Research task failed");
        } else if (response.data.status === 'canceled') {
          resultText = JSON.stringify({
            success: false,
            status: response.data.status,
            researchId: response.data.researchId,
            message: "Research task was canceled."
          }, null, 2);
          logger.log("Research task canceled");
        } else {
          resultText = JSON.stringify({
            success: false,
            status: response.data.status,
            researchId: response.data.researchId,
            message: `Unknown status: ${response.data.status}. Continue polling or restart the research task.`
          }, null, 2);
          logger.log(`Unknown status: ${response.data.status}`);
        }

        const result = {
          content: [{
            type: "text" as const,
            text: resultText
          }]
        };
        
        checkpoint('deep_research_check_complete');
        logger.complete();
        return result;
      } catch (error) {
        logger.error(error);
        
        if (axios.isAxiosError(error)) {
          // Handle specific 404 error for task not found
          if (error.response?.status === 404) {
            const errorData = error.response.data as DeepResearchErrorResponse;
            logger.log(`Research not found: ${researchId}`);
            return {
              content: [{
                type: "text" as const,
                text: JSON.stringify({
                  success: false,
                  error: "Research not found",
                  researchId: researchId,
                  message: "The specified research ID was not found. Please check the ID or start a new research task using deep_researcher_start."
                }, null, 2)
              }],
              isError: true,
            };
          }
          
          // Check for rate limit error on free MCP
          const rateLimitResult = handleRateLimitError(error, config?.userProvidedApiKey, 'deep_researcher_check');
          if (rateLimitResult) {
            return rateLimitResult;
          }
          
          // Handle other Axios errors
          const statusCode = error.response?.status || 'unknown';
          const errorMessage = error.response?.data?.message || error.message;
          
          logger.log(`Axios error (${statusCode}): ${errorMessage}`);
          return {
            content: [{
              type: "text" as const,
              text: `Research check error (${statusCode}): ${errorMessage}`
            }],
            isError: true,
          };
        }
        
        // Handle generic errors
        return {
          content: [{
            type: "text" as const,
            text: `Research check error: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true,
        };
      }
    }
  );
}                                                                                                                                                                                                                                                                                                