import { z } from "zod";
import { Exa } from "exa-js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG } from "./config.js";
import { ExaSearchRequest, ExaSearchResponse } from "../types.js";
import { createRequestLogger } from "../utils/logger.js";
import { retryWithBackoff, formatToolError } from "../utils/errorHandler.js";
import { sanitizeSearchResponse } from "../utils/exaResponseSanitizer.js";
import { checkpoint } from "agnost";

export function registerPeopleSearchTool(server: McpServer, config?: { exaApiKey?: string; userProvidedApiKey?: boolean }): void {
  server.tool(
    "people_search_exa",
    `[Deprecated: Use web_search_advanced_exa instead] Find people and their professional profiles.

Best for: Finding professionals, executives, or anyone with a public profile.
Returns: Profile information and links.`,
    {
      query: z.string().describe("Search query for finding people"),
      numResults: z.coerce.number().optional().describe("Number of profile results to return (must be a number, default: 5)")
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true
    },
    async ({ query, numResults }) => {
      const requestId = `people_search_exa-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'people_search_exa');
      
      logger.start(`${query}`);
      
      try {
        const exa = new Exa(config?.exaApiKey || process.env.EXA_API_KEY || '');

        let searchQuery = query;
        searchQuery = `${query} profile`;

        const searchRequest: ExaSearchRequest = {
          query: searchQuery,
          type: "auto",
          numResults: numResults || API_CONFIG.DEFAULT_NUM_RESULTS,
          category: "people",
          contents: {
            highlights: true,
          },
        };
        
        checkpoint('people_search_request_prepared');
        logger.log("Sending request to Exa API for people search");
        
        const response = await retryWithBackoff(() => exa.request<ExaSearchResponse>(
          API_CONFIG.ENDPOINTS.SEARCH,
          'POST',
          searchRequest,
          undefined,
          { 'x-exa-integration': 'people-search-mcp' }
        ));

        checkpoint('people_search_response_received');
        logger.log("Received response from Exa API");

        if (!response || !response.results || response.results.length === 0) {
          logger.log("Warning: Empty or invalid response from Exa API");
          checkpoint('people_search_complete');
          return {
            content: [{
              type: "text" as const,
              text: "No content found. Please try a different query."
            }]
          };
        }

        logger.log(`Found ${response.results.length} results`);

        const sanitized = sanitizeSearchResponse(response);
        const results = Array.isArray(sanitized.results) ? sanitized.results : [];

        const formattedResults = results.map((r) => {
          const highlights = Array.isArray(r.highlights) ? r.highlights.join('\n') : '';
          const lines = [
            `Title: ${r.title || 'N/A'}`,
            `URL: ${r.url}`,
            `Published: ${r.publishedDate || 'N/A'}`,
            `Author: ${r.author || 'N/A'}`,
            `Highlights:\n${highlights}`,
          ];
          return lines.join('\n');
        }).join('\n\n---\n\n');

        const searchTime = typeof sanitized.searchTime === 'number' ? sanitized.searchTime : undefined;

        const result = {
          content: [{
            type: "text" as const,
            text: formattedResults,
            _meta: {
              searchTime: searchTime
            }
          }]
        };
        
        checkpoint('people_search_complete');
        logger.complete();
        return result;
      } catch (error) {
        logger.error(error);
        return formatToolError(error, 'people_search_exa', config?.userProvidedApiKey);
      }
    }
  );
}
