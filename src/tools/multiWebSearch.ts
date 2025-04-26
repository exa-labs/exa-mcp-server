import { z } from "zod";
import axios from "axios";
import { toolRegistry, API_CONFIG } from "./config.js";
import { ExaSearchRequest, ExaSearchResponse } from "../types.js";
import { createRequestLogger } from "../utils/logger.js";

// Register the multi web search tool
toolRegistry["multi_web_search_exa"] = {
  name: "multi_web_search_exa",
  description: "Search the web using Exa AI for multiple queries simultaneously. Performs real-time web searches for each query and returns aggregated content from the most relevant websites.",
  schema: {
    queries: z.array(z.string()).describe("An array of search queries"),
    numResults: z.number().optional().describe("Number of search results to return per query (default: 5)")
  },
  handler: async ({ queries, numResults }, extra) => {
    const requestId = `multi_web_search_exa-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, 'multi_web_search_exa');
    
    logger.start(JSON.stringify(queries));
    
    try {
      // Create a fresh axios instance for shared configuration
      const axiosInstance = axios.create({
        baseURL: API_CONFIG.BASE_URL,
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'x-api-key': process.env.EXA_API_KEY || ''
        },
        timeout: 25000 // Timeout for individual requests
      });

      const searchPromises = queries.map(async (query: string) => {
        const searchRequest: ExaSearchRequest = {
          query,
          type: "auto",
          numResults: numResults || API_CONFIG.DEFAULT_NUM_RESULTS,
          contents: {
            text: {
              maxCharacters: API_CONFIG.DEFAULT_MAX_CHARACTERS
            }
          }
        };
        
        logger.log(`Sending request for query: "${query}" to Exa API`);
        
        try {
          const response = await axiosInstance.post<ExaSearchResponse>(
            API_CONFIG.ENDPOINTS.SEARCH,
            searchRequest,
            { timeout: 5000 } // Individual timeout
          );
          logger.log(`Received response for query: "${query}" from Exa API`);
          return { query, data: response.data };
        } catch (error) {
          logger.error(`Error searching for query "${query}": ${error}`);
          if (axios.isAxiosError(error) && error.response?.status === 429) {
            const infoMessage = "Our rate limit for an individual account is currently 5 requests per second. If you need a higher rate limit, you can email hello@exa.ai to discuss an Enterprise plan.";
            return { query, info: infoMessage };
          }
          let errorMessage = `Search error for query "${query}": ${error instanceof Error ? error.message : String(error)}`;
          let statusCode: string | number = 'unknown';
          if (axios.isAxiosError(error)) {
            statusCode = error.response?.status || 'unknown';
            errorMessage = `Search error for query "${query}" (${statusCode}): ${error.response?.data?.message || error.message}`;
          }
          return { query, error: errorMessage, isError: true };
        }
      });

      const results = await Promise.all(searchPromises);
      
      logger.log("All searches completed.");

      const aggregatedResults = results.map(result => {
        if ((result as any).info) {
          return { query: result.query, info: (result as any).info };
        }
        if (result.isError) {
          return { query: result.query, error: result.error };
        }
        if (!result.data || !result.data.results) {
          logger.log(`Warning: Empty or invalid response from Exa API for query "${result.query}"`);
          return { query: result.query, message: "No search results found." };
        }
        logger.log(`Found ${result.data.results.length} results for query "${result.query}"`);
        return { query: result.query, results: result.data.results };
      });

      const finalResult = {
        content: [{
          type: "text" as const,
          text: JSON.stringify(aggregatedResults, null, 2)
        }]
      };
      
      logger.complete();
      return finalResult;
    } catch (error) { // Catch potential errors in Promise.all or setup
      logger.error(error);
      return {
        content: [{
          type: "text" as const,
          text: `Overall multi-search error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true,
      };
    }
  },
  enabled: true // Enabled by default, adjust as needed
}; 