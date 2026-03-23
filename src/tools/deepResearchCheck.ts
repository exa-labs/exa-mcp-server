import { z } from "zod";
import { Exa, ExaError } from "exa-js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG } from "./config.js";
import { DeepResearchCheckResponse, DeepResearchErrorResponse } from "../types.js";
import { createRequestLogger } from "../utils/logger.js";
import { retryWithBackoff, formatToolError } from "../utils/errorHandler.js";
import { checkpoint } from "agnost";

// Helper function to create a delay
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function registerDeepResearchCheckTool(server: McpServer, config?: { exaApiKey?: string; userProvidedApiKey?: boolean }): void {
  server.tool(
    "deep_researcher_check",
    `[Deprecated] Check status and get results from a deep research task.

Best for: Getting the research report after calling deep_researcher_start.
Returns: Research report when complete, or status update if still running.
Important: Keep calling with the same research ID until status is 'completed'.`,
    {
      researchId: z.string().describe("The research ID returned from deep_researcher_start tool")
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true
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

        const exa = new Exa(config?.exaApiKey || process.env.EXA_API_KEY || '');

        logger.log(`Checking status for research: ${researchId}`);
        
        checkpoint('deep_research_check_request_prepared');
        const response = await retryWithBackoff(() => exa.request<DeepResearchCheckResponse>(
          `${API_CONFIG.ENDPOINTS.RESEARCH}/${researchId}`,
          'GET',
          undefined,
          undefined,
          { 'x-exa-integration': 'deep-research-mcp' }
        ));

        checkpoint('deep_research_check_response_received');
        logger.log(`Task status: ${response.status}`);

        if (!response) {
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

        if (response.status === 'completed') {
          resultText = JSON.stringify({
            success: true,
            status: response.status,
            researchId: response.researchId,
            report: response.output?.content || "No report generated",
            parsedOutput: response.output?.parsed,
            citations: response.citations,
            model: response.model,
            costDollars: response.costDollars,
            message: "Deep research completed! Here's your comprehensive research report."
          }, null, 2);
          logger.log("Research completed successfully");
        } else if (response.status === 'running' || response.status === 'pending') {
          resultText = JSON.stringify({
            success: true,
            status: response.status,
            researchId: response.researchId,
            message: "Research in progress. Continue polling...",
            nextAction: "Call deep_researcher_check again with the same research ID"
          }, null, 2);
          logger.log("Research still in progress");
        } else if (response.status === 'failed') {
          resultText = JSON.stringify({
            success: false,
            status: response.status,
            researchId: response.researchId,
            createdAt: new Date(response.createdAt).toISOString(),
            instructions: response.instructions,
            message: "Deep research task failed. Please try starting a new research task with different instructions."
          }, null, 2);
          logger.log("Research task failed");
        } else if (response.status === 'canceled') {
          resultText = JSON.stringify({
            success: false,
            status: response.status,
            researchId: response.researchId,
            message: "Research task was canceled."
          }, null, 2);
          logger.log("Research task canceled");
        } else {
          resultText = JSON.stringify({
            success: false,
            status: response.status,
            researchId: response.researchId,
            message: `Unknown status: ${response.status}. Continue polling or restart the research task.`
          }, null, 2);
          logger.log(`Unknown status: ${response.status}`);
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

        // Handle specific 404 error for task not found
        if (error instanceof ExaError && error.statusCode === 404) {
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

        return formatToolError(error, 'deep_researcher_check', config?.userProvidedApiKey);
      }
    }
  );
}                                                                                                                                                                                                                                                                                                