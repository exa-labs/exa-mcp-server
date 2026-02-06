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
Important: Keep calling with the same task ID until status is 'completed'.`,
    {
      taskId: z.string().min(1).describe("The task ID returned from deep_researcher_start tool")
    },
    async ({ taskId }) => {
      const requestId = `deep_researcher_check-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'deep_researcher_check');
      
      logger.start(taskId);
      
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

        logger.log(`Checking status for task: ${taskId}`);
        
        checkpoint('deep_research_check_request_prepared');
        const response = await axiosInstance.get<DeepResearchCheckResponse>(
          `${API_CONFIG.ENDPOINTS.RESEARCH}/${taskId}`,
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
            taskId: response.data.researchId,
            report: response.data.output?.content || "No report generated",
            model: response.data.model,
            message: "Deep research completed! Here's your research report."
          }, null, 2);
          logger.log("Research completed successfully");
        } else if (response.data.status === 'running' || response.data.status === 'pending') {
          resultText = JSON.stringify({
            success: true,
            status: response.data.status,
            taskId: response.data.researchId,
            message: "Research in progress. Continue polling...",
            nextAction: "Call deep_researcher_check again with the same task ID"
          }, null, 2);
          logger.log("Research still in progress");
        } else if (response.data.status === 'failed') {
          resultText = JSON.stringify({
            success: false,
            status: response.data.status,
            taskId: response.data.researchId,
            error: response.data.error,
            message: "Deep research task failed. Please try starting a new research task with different instructions."
          }, null, 2);
          logger.log("Research task failed");
        } else {
          resultText = JSON.stringify({
            success: false,
            status: response.data.status,
            taskId: response.data.researchId,
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
            logger.log(`Task not found: ${taskId}`);
            return {
              content: [{
                type: "text" as const,
                text: JSON.stringify({
                  success: false,
                  error: "Task not found",
                  taskId: taskId,
                  message: "🚫 The specified task ID was not found. Please check the ID or start a new research task using deep_researcher_start."
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