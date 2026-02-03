import { z } from "zod";
import axios from "axios";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG } from "./config.js";
import { ExaSearchRequest, ExaSearchResponse } from "../types.js";
import { createRequestLogger } from "../utils/logger.js";
import { handleRateLimitError } from "../utils/errorHandler.js";
import { checkpoint } from "agnost";

export function registerLinkedInSearchTool(server: McpServer, config?: { exaApiKey?: string; userProvidedApiKey?: boolean }): void {
  server.tool(
    "linkedin_search_exa",
    "⚠️ DEPRECATED: This tool is deprecated. Please use 'people_search_exa' instead. This tool will be removed in a future version. For now, it searches for people on LinkedIn using Exa AI - finds professional profiles and people.",
    {
      query: z.string().describe("Search query for finding people on LinkedIn"),
      numResults: z.coerce.number().optional().describe("Number of LinkedIn profile results to return (must be a number, default: 5)")
    },
    async ({ query, numResults }) => {
      const requestId = `linkedin_search_exa-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'linkedin_search_exa');
      
      logger.start(`${query}`);
      
      try {
        // Create a fresh axios instance for each request
        const axiosInstance = axios.create({
          baseURL: API_CONFIG.BASE_URL,
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'x-api-key': config?.exaApiKey || process.env.EXA_API_KEY || '',
            'x-exa-integration': 'linkedin-search-mcp'
          },
          timeout: 25000
        });

        let searchQuery = query;
        searchQuery = `${query} LinkedIn profile`;

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
        
        checkpoint('linkedin_search_request_prepared');
        logger.log("Sending request to Exa API for LinkedIn search");
        
        const response = await axiosInstance.post<ExaSearchResponse>(
          API_CONFIG.ENDPOINTS.SEARCH,
          searchRequest,
          { timeout: 25000 }
        );
        
        checkpoint('linkedin_search_response_received');
        logger.log("Received response from Exa API");

        if (!response.data || !response.data.results) {
          logger.log("Warning: Empty or invalid response from Exa API");
          checkpoint('linkedin_search_complete');
          return {
            content: [{
              type: "text" as const,
              text: "No LinkedIn content found. Please try a different query. Note: This tool is deprecated - please use 'people_search_exa' instead."
            }]
          };
        }

        logger.log(`Found ${response.data.results.length} LinkedIn results`);
        
        // Add deprecation notice to the response
        const deprecationNotice = "\n\n⚠️ DEPRECATION NOTICE: This tool (linkedin_search_exa) is deprecated. Please use 'people_search_exa' instead for future requests.";
        
        const result = {
          content: [{
            type: "text" as const,
            text: JSON.stringify(response.data, null, 2) + deprecationNotice
          }]
        };
        
        checkpoint('linkedin_search_complete');
        logger.complete();
        return result;
      } catch (error) {
        logger.error(error);
        
        // Check for rate limit error on free MCP
        const rateLimitResult = handleRateLimitError(error, config?.userProvidedApiKey, 'linkedin_search_exa');
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
              text: `LinkedIn search error (${statusCode}): ${errorMessage}\n\n⚠️ Note: This tool is deprecated. Please use 'people_search_exa' instead.`
            }],
            isError: true,
          };
        }
        
        // Handle generic errors
        return {
          content: [{
            type: "text" as const,
            text: `LinkedIn search error: ${error instanceof Error ? error.message : String(error)}\n\n⚠️ Note: This tool is deprecated. Please use 'people_search_exa' instead.`
          }],
          isError: true,
        };
      }
    }
  );
}
