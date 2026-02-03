import { z } from "zod";
import axios from "axios";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG } from "./config.js";
import { ExaSearchRequest, ExaSearchResponse } from "../types.js";
import { createRequestLogger } from "../utils/logger.js";
import { handleRateLimitError } from "../utils/errorHandler.js";
import { checkpoint } from "agnost";

export function registerPeopleSearchTool(server: McpServer, config?: { exaApiKey?: string; userProvidedApiKey?: boolean }): void {
  server.tool(
    "people_search_exa",
    `Find people and their professional profiles.

Best for: Finding professionals, executives, or anyone with a public profile.
Returns: Profile information and links.`,
    {
      query: z.string().describe("Search query for finding people"),
      numResults: z.coerce.number().optional().describe("Number of profile results to return (must be a number, default: 5)")
    },
    async ({ query, numResults }) => {
      const requestId = `people_search_exa-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'people_search_exa');
      
      logger.start(`${query}`);
      
      try {
        // Create a fresh axios instance for each request
        const axiosInstance = axios.create({
          baseURL: API_CONFIG.BASE_URL,
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'x-api-key': config?.exaApiKey || process.env.EXA_API_KEY || '',
            'x-exa-integration': 'people-search-mcp'
          },
          timeout: 25000
        });

        let searchQuery = query;
        searchQuery = `${query} profile`;

        const searchRequest: ExaSearchRequest = {
          query: searchQuery,
          type: "auto",
          numResults: numResults || API_CONFIG.DEFAULT_NUM_RESULTS,
          category: "people",
          contents: {
            text: {
              maxCharacters: API_CONFIG.DEFAULT_MAX_CHARACTERS
            },
          },
        };
        
        checkpoint('people_search_request_prepared');
        logger.log("Sending request to Exa API for people search");
        
        const response = await axiosInstance.post<ExaSearchResponse>(
          API_CONFIG.ENDPOINTS.SEARCH,
          searchRequest,
          { timeout: 25000 }
        );
        
        checkpoint('people_search_response_received');
        logger.log("Received response from Exa API");

        if (!response.data || !response.data.results) {
          logger.log("Warning: Empty or invalid response from Exa API");
          checkpoint('people_search_complete');
          return {
            content: [{
              type: "text" as const,
              text: "No content found. Please try a different query."
            }]
          };
        }

        logger.log(`Found ${response.data.results.length} results`);
        
        const result = {
          content: [{
            type: "text" as const,
            text: JSON.stringify(response.data, null, 2)
          }]
        };
        
        checkpoint('people_search_complete');
        logger.complete();
        return result;
      } catch (error) {
        logger.error(error);
        
        // Check for rate limit error on free MCP
        const rateLimitResult = handleRateLimitError(error, config?.userProvidedApiKey, 'people_search_exa');
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
              text: `People search error (${statusCode}): ${errorMessage}`
            }],
            isError: true,
          };
        }
        
        // Handle generic errors
        return {
          content: [{
            type: "text" as const,
            text: `People search error: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true,
        };
      }
    }
  );
}
