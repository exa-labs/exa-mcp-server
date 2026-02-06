import { z } from "zod";
import axios from "axios";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG } from "./config.js";
import { ExaSearchRequest, ExaSearchResponse } from "../types.js";
import { createRequestLogger } from "../utils/logger.js";
import { handleRateLimitError } from "../utils/errorHandler.js";
import { checkpoint } from "agnost"

export function registerWebSearchTool(server: McpServer, config?: { exaApiKey?: string; userProvidedApiKey?: boolean }): void {
  server.tool(
    "web_search_exa",
    `Search the web for any topic and get clean, ready-to-use content.

Best for: Finding current information, news, facts, or answering questions about any topic.
Returns: Clean text content from top search results, ready for LLM use.`,
    {
      query: z.string().describe("Websearch query"),
      numResults: z.coerce.number().optional().describe("Number of search results to return (must be a number, default: 8)"),
      livecrawl: z.enum(['fallback', 'preferred']).optional().describe("Live crawl mode - 'fallback': use live crawling as backup if cached content unavailable, 'preferred': prioritize live crawling (default: 'fallback')"),
      type: z.enum(['auto', 'fast']).optional().describe("Search type - 'auto': balanced search (default), 'fast': quick results"),
      contextMaxCharacters: z.coerce.number().optional().describe("Maximum characters for context string optimized for LLMs (must be a number, default: 10000)"),
      includeDomains: z.array(z.string()).optional().describe("Only include results from these domains (e.g. ['example.com', 'another.com'])"),
      excludeDomains: z.array(z.string()).optional().describe("Exclude results from these domains (e.g. ['spam.com'])"),
      startPublishedDate: z.string().optional().describe("Only return results published after this date (ISO 8601 format, e.g. '2024-01-01T00:00:00.000Z')"),
      endPublishedDate: z.string().optional().describe("Only return results published before this date (ISO 8601 format, e.g. '2025-01-01T00:00:00.000Z')"),
      category: z.enum(['company', 'research paper', 'news', 'pdf', 'github', 'tweet', 'personal site', 'people', 'financial report']).optional().describe("Category filter for search results")
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true
    },
    async ({ query, numResults, livecrawl, type, contextMaxCharacters, includeDomains, excludeDomains, startPublishedDate, endPublishedDate, category }) => {
      const requestId = `web_search_exa-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'web_search_exa');
      
      logger.start(query);
      
      try {
        // Create a fresh axios instance for each request
        const axiosInstance = axios.create({
          baseURL: API_CONFIG.BASE_URL,
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'x-api-key': config?.exaApiKey || process.env.EXA_API_KEY || '',
            'x-exa-integration': 'web-search-mcp'
          },
          timeout: 25000
        });

        const searchRequest: ExaSearchRequest = {
          query,
          type: type || "auto",
          numResults: numResults || API_CONFIG.DEFAULT_NUM_RESULTS,
          ...(includeDomains && { includeDomains }),
          ...(excludeDomains && { excludeDomains }),
          ...(startPublishedDate && { startPublishedDate }),
          ...(endPublishedDate && { endPublishedDate }),
          ...(category && { category }),
          contents: {
            text: true,
            context: {
              maxCharacters: contextMaxCharacters || 10000
            },
            livecrawl: livecrawl || 'fallback'
          }
        };
        
        checkpoint('web_search_request_prepared');
        logger.log("Sending request to Exa API");
        
        const response = await axiosInstance.post<ExaSearchResponse>(
          API_CONFIG.ENDPOINTS.SEARCH,
          searchRequest,
          { timeout: 25000 }
        );
        
        checkpoint('exa_search_response_received');
        logger.log("Received response from Exa API");

        if (!response.data || !response.data.context) {
          logger.log("Warning: Empty or invalid response from Exa API");
          checkpoint('web_search_complete');
          return {
            content: [{
              type: "text" as const,
              text: "No search results found. Please try a different query."
            }]
          };
        }

        logger.log(`Context received with ${response.data.context.length} characters`);
        
        const result = {
          content: [{
            type: "text" as const,
            text: response.data.context
          }]
        };
        
        checkpoint('web_search_complete');
        logger.complete();
        return result;
      } catch (error) {
        logger.error(error);
        
        // Check for rate limit error on free MCP
        const rateLimitResult = handleRateLimitError(error, config?.userProvidedApiKey, 'web_search_exa');
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
              text: `Search error (${statusCode}): ${errorMessage}`
            }],
            isError: true,
          };
        }
        
        // Handle generic errors
        return {
          content: [{
            type: "text" as const,
            text: `Search error: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true,
        };
      }
    }
  );
}                                                                                                                                                                                                                                                                                                                                                                                                