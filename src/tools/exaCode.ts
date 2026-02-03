import { z } from "zod";
import axios from "axios";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG } from "./config.js";
import { ExaCodeRequest, ExaCodeResponse } from "../types.js";
import { createRequestLogger } from "../utils/logger.js";
import { handleRateLimitError } from "../utils/errorHandler.js";
import { checkpoint } from "agnost";

export function registerExaCodeTool(server: McpServer, config?: { exaApiKey?: string; userProvidedApiKey?: boolean }): void {
  server.tool(
    "get_code_context_exa",
    `Find code examples, documentation, and programming solutions. Searches GitHub, Stack Overflow, and official docs.

Best for: Any programming question - API usage, library examples, code snippets, debugging help.
Returns: Relevant code and documentation, formatted for easy reading.`,
    {
      query: z.string().describe("Search query to find relevant context for APIs, Libraries, and SDKs. For example, 'React useState hook examples', 'Python pandas dataframe filtering', 'Express.js middleware', 'Next js partial prerendering configuration'"),
      tokensNum: z.coerce.number().min(1000).max(50000).default(5000).describe("Number of tokens to return (must be a number, 1000-50000). Default is 5000 tokens. Adjust this value based on how much context you need - use lower values for focused queries and higher values for comprehensive documentation.")
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true
    },
    async ({ query, tokensNum }) => {
      const requestId = `get_code_context_exa-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'get_code_context_exa');
      
      logger.start(`Searching for code context: ${query}`);
      
      try {
        // Create a fresh axios instance for each request
        const axiosInstance = axios.create({
          baseURL: API_CONFIG.BASE_URL,
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'x-api-key': config?.exaApiKey || process.env.EXA_API_KEY || '',
            'x-exa-integration': 'exa-code-mcp'
          },
          timeout: 30000
        });

        const exaCodeRequest: ExaCodeRequest = {
          query,
          tokensNum
        };
        
        checkpoint('code_context_request_prepared');
        logger.log("Sending code context request to Exa API");
        
        const response = await axiosInstance.post<ExaCodeResponse>(
          API_CONFIG.ENDPOINTS.CONTEXT,
          exaCodeRequest,
          { timeout: 30000 }
        );
        
        checkpoint('code_context_response_received');
        logger.log("Received code context response from Exa API");

        if (!response.data) {
          logger.log("Warning: Empty response from Exa Code API");
          checkpoint('code_context_complete');
          return {
            content: [{
              type: "text" as const,
              text: "No code snippets or documentation found. Please try a different query, be more specific about the library or programming concept, or check the spelling of framework names."
            }]
          };
        }

        logger.log(`Code search completed with ${response.data.resultsCount || 0} results`);
        
        // Return the actual code content from the response field
        const codeContent = typeof response.data.response === 'string' 
          ? response.data.response 
          : JSON.stringify(response.data.response, null, 2);
        
        const result = {
          content: [{
            type: "text" as const,
            text: codeContent
          }]
        };
        
        checkpoint('code_context_complete');
        logger.complete();
        return result;
      } catch (error) {
        logger.error(error);
        
        // Check for rate limit error on free MCP
        const rateLimitResult = handleRateLimitError(error, config?.userProvidedApiKey, 'get_code_context_exa');
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
              text: `Code search error (${statusCode}): ${errorMessage}. Please check your query and try again.`
            }],
            isError: true,
          };
        }
        
        // Handle generic errors
        return {
          content: [{
            type: "text" as const,
            text: `Code search error: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true,
        };
      }
    }
  );
}
