import { z } from "zod";
import axios from "axios";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG } from "./config.js";
import { ExaCodeRequest, ExaCodeResponse } from "../types.js";
import { createRequestLogger } from "../utils/logger.js";
import { handleRateLimitError } from "../utils/errorHandler.js";
import { checkpoint } from "agnost";

const MAX_RETRIES = 2;

function isTransientError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  if (!error.response) return true;
  const status = error.response.status;
  return status >= 500;
}

function extractServerRequestId(error: unknown): string | undefined {
  if (!axios.isAxiosError(error)) return undefined;
  return error.response?.data?.requestId;
}

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
        
        let lastError: unknown = null;
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          if (attempt > 0) {
            const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
            logger.log(`Retry attempt ${attempt}/${MAX_RETRIES} after ${delayMs}ms delay`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
          
          try {
            logger.log(`Sending code context request to Exa API (attempt ${attempt + 1}/${MAX_RETRIES + 1})`);
            
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
          } catch (retryError) {
            lastError = retryError;
            if (!isTransientError(retryError) || attempt === MAX_RETRIES) {
              throw retryError;
            }
            const status = axios.isAxiosError(retryError) ? retryError.response?.status : 'unknown';
            const serverReqId = extractServerRequestId(retryError);
            const errorBody = axios.isAxiosError(retryError) ? JSON.stringify(retryError.response?.data) : undefined;
            logger.log(`Transient error (${status}), will retry. Server requestId: ${serverReqId || 'N/A'}. Response: ${errorBody || 'N/A'}`);
          }
        }
        
        throw lastError;
      } catch (error) {
        logger.error(error);
        
        // Check for rate limit error on free MCP
        const rateLimitResult = handleRateLimitError(error, config?.userProvidedApiKey, 'get_code_context_exa');
        if (rateLimitResult) {
          return rateLimitResult;
        }
        
        if (axios.isAxiosError(error)) {
          const statusCode = error.response?.status || 'unknown';
          const serverReqId = extractServerRequestId(error);
          const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message;
          const isTransient = !error.response || (typeof statusCode === 'number' && statusCode >= 500);
          
          logger.log(`Axios error (${statusCode}): ${errorMessage}. Server requestId: ${serverReqId || 'N/A'}. Full response: ${JSON.stringify(error.response?.data)}`);
          return {
            content: [{
              type: "text" as const,
              text: `Code search error (${statusCode}): ${errorMessage}\nRequest ID: ${serverReqId || requestId}${isTransient ? '\nThis error appears to be transient. Please retry the request.' : '\nThis error appears to be permanent. Please check your query parameters.'}`
            }],
            isError: true,
          };
        }
        
        return {
          content: [{
            type: "text" as const,
            text: `Code search error: ${error instanceof Error ? error.message : String(error)}\nRequest ID: ${requestId}\nPlease retry the request.`
          }],
          isError: true,
        };
      }
    }
  );
}
