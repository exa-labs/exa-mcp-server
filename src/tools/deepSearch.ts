import { z } from "zod";
import axios from "axios";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG } from "./config.js";
import { ExaSearchRequest, ExaSearchResponse } from "../types.js";
import { createRequestLogger } from "../utils/logger.js";

export function registerDeepSearchTool(server: McpServer, config?: { exaApiKey?: string }): void {
  server.tool(
    "deep_search_exa",
    "Searches the web and return results in a natural language format.",
    {
      objective: z.string().describe("Natural language description of what the web search is looking for. Try to make the search query atomic - looking for a specific piece of information. May include guidance about preferred sources or freshness."),
      search_queries: z.array(z.string()).optional().describe("Optional list of keyword search queries, may include search operators. The search queries should be related to the user's objective. Limited to 5 entries of up to 5 words each (around 200 characters)."),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true
    },
    async ({ objective, search_queries }) => {
      const requestId = `deep_search_exa-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'deep_search_exa');
      
      logger.start(objective);
      
      try {
        // Create a fresh axios instance for each request
        const axiosInstance = axios.create({
          baseURL: API_CONFIG.BASE_URL,
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'x-api-key': config?.exaApiKey || process.env.EXA_API_KEY || '',
            'x-exa-integration': 'deep-search-mcp'
          },
          timeout: 25000
        });

        const searchRequest: ExaSearchRequest = {
          query: objective,
          type: "deep",
          contents: {
            context: true
          }
        };
        
        // Add additional queries if provided
        if (search_queries && search_queries.length > 0) {
          searchRequest.additionalQueries = search_queries;
          logger.log(`Using ${search_queries.length} additional queries`);
        } else {
          logger.log("Using automatic query expansion");
        }
        
        logger.log("Sending deep search request to Exa API");
        
        const response = await axiosInstance.post<ExaSearchResponse>(
          API_CONFIG.ENDPOINTS.SEARCH,
          searchRequest,
          { timeout: 25000 }
        );
        
        logger.log("Received response from Exa API");

        if (!response.data || !response.data.context) {
          logger.log("Warning: Empty or invalid response from Exa API");
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
              text: `Deep search error (${statusCode}): ${errorMessage}`
            }],
            isError: true,
          };
        }
        
        // Handle generic errors
        return {
          content: [{
            type: "text" as const,
            text: `Deep search error: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true,
        };
      }
    }
  );
}

