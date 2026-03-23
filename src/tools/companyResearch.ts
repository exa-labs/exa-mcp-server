import { z } from "zod";
import { Exa } from "exa-js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG } from "./config.js";
import { ExaSearchRequest, ExaSearchResponse } from "../types.js";
import { createRequestLogger } from "../utils/logger.js";
import { retryWithBackoff, formatToolError } from "../utils/errorHandler.js";
import { sanitizeSearchResponse } from "../utils/exaResponseSanitizer.js";
import { checkpoint } from "agnost";

export function registerCompanyResearchTool(server: McpServer, config?: { exaApiKey?: string; userProvidedApiKey?: boolean }): void {
  server.tool(
    "company_research_exa",
    `[Deprecated: Use web_search_advanced_exa instead] Research any company to get business information, news, and insights.

Best for: Learning about a company's products, services, recent news, or industry position.
Returns: Company information from trusted business sources.`,
    {
      companyName: z.string().describe("Name of the company to research"),
      numResults: z.coerce.number().optional().describe("Number of search results to return (must be a number, default: 3)")
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true
    },
    async ({ companyName, numResults }) => {
      const requestId = `company_research_exa-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'company_research_exa');
      
      logger.start(companyName);
      
      try {
        const exa = new Exa(config?.exaApiKey || process.env.EXA_API_KEY || '');

        const searchRequest: ExaSearchRequest = {
          query: `${companyName} company`,
          type: "auto",
          numResults: numResults || 3,
          category: "company",
          contents: {
            highlights: true
          }
        };
        
        checkpoint('company_research_request_prepared');
        logger.log("Sending request to Exa API for company research");
        
        const response = await retryWithBackoff(() => exa.request<ExaSearchResponse>(
          API_CONFIG.ENDPOINTS.SEARCH,
          'POST',
          searchRequest,
          undefined,
          { 'x-exa-integration': 'company-research-mcp' }
        ));

        checkpoint('company_research_response_received');
        logger.log("Received response from Exa API");

        if (!response || !response.results || response.results.length === 0) {
          logger.log("Warning: Empty or invalid response from Exa API");
          checkpoint('company_research_complete');
          return {
            content: [{
              type: "text" as const,
              text: "No company information found. Please try a different company name."
            }]
          };
        }

        logger.log(`Found ${response.results.length} company research results`);

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
        
        checkpoint('company_research_complete');
        logger.complete();
        return result;
      } catch (error) {
        logger.error(error);
        return formatToolError(error, 'company_research_exa', config?.userProvidedApiKey);
      }
    }
  );
}                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                