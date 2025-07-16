import { z } from "zod";
import axios from "axios";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG } from "./config.js";
import { DeepResearchCheckResponse, DeepResearchErrorResponse } from "../types.js";
import { createRequestLogger } from "../utils/logger.js";

// Helper function to create a delay
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function registerDeepResearchCheckTool(server: McpServer, config?: { exaApiKey?: string }): void {
  server.tool(
    "deep_researcher_check",
    "Check the status and retrieve results of a deep research task. This tool monitors the progress of an AI agent that performs comprehensive web searches, analyzes multiple sources, and synthesizes findings into detailed research reports. The tool includes a built-in 5-second delay before checking to allow processing time. IMPORTANT: You must call this tool repeatedly (poll) until the status becomes 'completed' to get the final research results. When status is 'running', wait a few seconds and call this tool again with the same task ID.",
    {
      taskId: z.string().describe("The task ID returned from deep_researcher_start tool")
    },
    async ({ taskId }) => {
      const requestId = `deep_researcher_check-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'deep_researcher_check');
      
      logger.start(taskId);
      
      try {
        // Built-in delay to allow processing time
        logger.log("Waiting 5 seconds before checking status...");
        await delay(5000);

        // Create a fresh axios instance for each request
        const axiosInstance = axios.create({
          baseURL: API_CONFIG.BASE_URL,
          headers: {
            'accept': 'application/json',
            'x-api-key': config?.exaApiKey || process.env.EXA_API_KEY || ''
          },
          timeout: 25000
        });

        logger.log(`Checking status for task: ${taskId}`);
        
        const response = await axiosInstance.get<DeepResearchCheckResponse>(
          `${API_CONFIG.ENDPOINTS.RESEARCH_TASKS}/${taskId}`,
          { timeout: 25000 }
        );
        
        logger.log(`Task status: ${response.data.status}`);

        if (!response.data) {
          logger.log("Warning: Empty response from Exa Research API");
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
          // Task completed - return only the essential research report to avoid context overflow
          resultText = JSON.stringify({
            success: true,
            status: response.data.status,
            taskId: response.data.id,
            report: response.data.data?.report || "No report generated",
            timeMs: response.data.timeMs,
            model: response.data.model,
            message: "🎉 Deep research completed! Here's your comprehensive research report."
          }, null, 2);
          logger.log("Research completed successfully");
        } else if (response.data.status === 'running') {
          // Task still running - return minimal status to avoid filling context window
          resultText = JSON.stringify({
            success: true,
            status: response.data.status,
            taskId: response.data.id,
            message: "🔄 Research in progress. Continue polling...",
            nextAction: "Call deep_researcher_check again with the same task ID"
          }, null, 2);
          logger.log("Research still in progress");
        } else if (response.data.status === 'failed') {
          // Task failed
          resultText = JSON.stringify({
            success: false,
            status: response.data.status,
            taskId: response.data.id,
            createdAt: new Date(response.data.createdAt).toISOString(),
            instructions: response.data.instructions,
            message: "❌ Deep research task failed. Please try starting a new research task with different instructions."
          }, null, 2);
          logger.log("Research task failed");
        } else {
          // Unknown status
          resultText = JSON.stringify({
            success: false,
            status: response.data.status,
            taskId: response.data.id,
            message: `⚠️ Unknown status: ${response.data.status}. Continue polling or restart the research task.`
          }, null, 2);
          logger.log(`Unknown status: ${response.data.status}`);
        }

        const result = {
          content: [{
            type: "text" as const,
            text: resultText
          }]
        };
        
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