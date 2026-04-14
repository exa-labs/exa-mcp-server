import { z } from "zod";
import { Exa } from "exa-js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG, integrationHeaders } from "./config.js";
import { ExaSearchRequest, ExaSearchResponse } from "../types.js";
import { createRequestLogger } from "../utils/logger.js";
import { retryWithBackoff, formatToolError } from "../utils/errorHandler.js";
import { sanitizeSearchResponse } from "../utils/exaResponseSanitizer.js";
import { checkpoint } from "agnost";

export function registerExaCodeTool(server: McpServer, config?: { exaApiKey?: string; userProvidedApiKey?: boolean }): void {
  server.tool(
    "get_code_context_exa",
    `Find code examples, documentation, and programming solutions. 

Best for: Any programming question - API usage, library examples, code snippets, debugging help.
Returns: Relevant code and documentation.

Query tips: describe what you're looking for specifically. "Python requests library POST with JSON body" not "python http".
If highlights are insufficient, follow up with web_fetch_exa on the best URLs.`,
    {
      query: z.string().describe("Search query to find relevant context for APIs, Libraries, and SDKs. For example, 'React useState hook examples', 'Python pandas dataframe filtering', 'Express.js middleware', 'Next js partial prerendering configuration'"),
      numResults: z.coerce.number().min(1).max(20).optional().describe("Number of search results to return (must be a number, default: 8)"),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true
    },
    async ({ query, numResults }) => {
      const requestId = `get_code_context_exa-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'get_code_context_exa');

      logger.start(`Searching for code context: ${query}`);

      try {
        const exa = new Exa(config?.exaApiKey || process.env.EXA_API_KEY || '');

        const searchRequest: ExaSearchRequest = {
          query,
          type: "fast",
          numResults: numResults || API_CONFIG.DEFAULT_NUM_RESULTS,
          contents: {
            highlights: {
              query,
            },
            text: { maxCharacters: 300 },
          }
        };

        checkpoint('code_context_request_prepared');
        logger.log("Sending code search request to Exa API");

        const response = await retryWithBackoff(() => exa.request<ExaSearchResponse>(
          API_CONFIG.ENDPOINTS.SEARCH,
          'POST',
          searchRequest,
          undefined,
          integrationHeaders('exa-code-mcp', config)
        ));

        checkpoint('code_context_response_received');
        logger.log("Received code search response from Exa API");

        if (!response || !response.results || response.results.length === 0) {
          logger.log("Warning: Empty or invalid response from Exa API");
          checkpoint('code_context_complete');
          return {
            content: [{
              type: "text" as const,
              text: "No code snippets or documentation found. Please try a different query, be more specific about the library or programming concept, or check the spelling of framework names."
            }]
          };
        }

        logger.log(`Received ${response.results.length} results with highlights`);

        const sanitized = sanitizeSearchResponse(response);
        const results = Array.isArray(sanitized.results) ? sanitized.results : [];

        const formattedResults = results.map((r) => {
          const lines = [
            `Title: ${r.title || 'N/A'}`,
            `URL: ${r.url}`,
          ];
          if (Array.isArray(r.highlights) && r.highlights.length > 0) {
            lines.push(`Code/Highlights:\n${r.highlights.join('\n')}`);
          } else if (r.text) {
            lines.push(`Text: ${r.text}`);
          }
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

        checkpoint('code_context_complete');
        logger.complete();
        return result;
      } catch (error) {
        logger.error(error);
        return formatToolError(error, 'get_code_context_exa', config?.userProvidedApiKey);
      }
    }
  );
}
