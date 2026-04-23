import { z } from "zod";
import { Exa } from "exa-js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG, integrationHeaders } from "./config.js";
import { ExaAdvancedSearchRequest, ExaSearchResponse } from "../types.js";
import { createRequestLogger } from "../utils/logger.js";
import { retryWithBackoff, formatToolError } from "../utils/errorHandler.js";
import { sanitizeSearchResponse } from "../utils/exaResponseSanitizer.js";
import { checkpoint } from "agnost";

export function registerWebSearchAdvancedTool(server: McpServer, config?: { exaApiKey?: string; userProvidedApiKey?: boolean }): void {
  server.tool(
    "web_search_advanced_exa",
    `Advanced web search with full control over filters, domains, dates, and content options.

Best for: When you need specific filters like date ranges, domain restrictions, or category filters.
Not recommended for: Simple searches - use web_search_exa instead.
Returns: Search results with optional highlights, summaries, and subpage content.`,
    {
      query: z.string().describe("Search query - can be a question, statement, or keywords"),
      numResults: z.coerce.number().optional().describe("Number of results (must be a number, 1-100, default: 10)"),
      type: z.enum(['auto', 'fast', 'instant']).optional().describe("Search type - 'auto': high quality and works with all filters (recommended), 'fast': quick results, 'instant': fastest results"),

      category: z.enum(['company', 'research paper', 'news', 'pdf', 'github', 'personal site', 'people', 'financial report']).optional().describe("Filter results to a specific category"),

      includeDomains: z.array(z.string()).optional().describe("Only include results from these domains (e.g., ['arxiv.org', 'github.com'])"),
      excludeDomains: z.array(z.string()).optional().describe("Exclude results from these domains"),

      startPublishedDate: z.string().optional().describe("Only include results published after this date (ISO 8601: YYYY-MM-DD)"),
      endPublishedDate: z.string().optional().describe("Only include results published before this date (ISO 8601: YYYY-MM-DD)"),
      startCrawlDate: z.string().optional().describe("Only include results crawled after this date (ISO 8601: YYYY-MM-DD)"),
      endCrawlDate: z.string().optional().describe("Only include results crawled before this date (ISO 8601: YYYY-MM-DD)"),

      includeText: z.array(z.string()).optional().describe("Only include results containing ALL of these text strings"),
      excludeText: z.array(z.string()).optional().describe("Exclude results containing ANY of these text strings"),

      userLocation: z.string().optional().describe("ISO country code for geo-targeted results (e.g., 'US', 'GB', 'DE')"),

      moderation: z.boolean().optional().describe("Filter out unsafe/inappropriate content"),

      additionalQueries: z.array(z.string()).optional().describe("Additional query variations to expand search coverage"),

      textMaxCharacters: z.coerce.number().min(1).optional().describe("Max characters for text extraction per result (must be a positive number)"),
      contextMaxCharacters: z.coerce.number().min(1).optional().describe("Max characters for context string (must be a positive number, not included by default)"),

      enableSummary: z.boolean().optional().describe("Enable summary generation for results"),
      summaryQuery: z.string().optional().describe("Focus query for summary generation"),

      enableHighlights: z.boolean().optional().describe("Enable highlights extraction"),
      highlightsMaxCharacters: z.coerce.number().optional().describe("Maximum total characters across all highlights per URL (must be a number). Preferred over highlightsNumSentences."),
      highlightsNumSentences: z.coerce.number().optional().describe("Deprecated: mapped to ~1333 chars/sentence. Use highlightsMaxCharacters instead."),
      highlightsPerUrl: z.coerce.number().optional().describe("Deprecated: currently ignored server-side. Use highlightsMaxCharacters instead."),
      highlightsQuery: z.string().optional().describe("Query for highlight relevance"),

      maxAgeHours: z.coerce.number().optional().describe("Maximum age of cached content in hours. 0 = always fetch fresh content, omit = use cached content with fresh fetch fallback (must be a number)"),
      livecrawlTimeout: z.coerce.number().optional().describe("Timeout in milliseconds for fetching fresh content when maxAgeHours triggers a live fetch (must be a number)"),

      subpages: z.coerce.number().optional().describe("Number of subpages to crawl from each result (must be a number, 1-10)"),
      subpageTarget: z.array(z.string()).optional().describe("Keywords to target when selecting subpages"),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true
    },
    async (params) => {
      const requestId = `web_search_advanced_exa-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'web_search_advanced_exa');

      logger.start(params.query);

      try {
        const exa = new Exa(config?.exaApiKey || process.env.EXA_API_KEY || '');

        const contents: ExaAdvancedSearchRequest['contents'] = {
          text: params.textMaxCharacters ? { maxCharacters: params.textMaxCharacters } : true,
          ...(params.maxAgeHours !== undefined ? { maxAgeHours: params.maxAgeHours } : { livecrawl: 'fallback' as const }),
          ...(params.livecrawlTimeout && { livecrawlTimeout: params.livecrawlTimeout }),
        };

        if (params.contextMaxCharacters) {
          contents.context = { maxCharacters: params.contextMaxCharacters };
        }

        if (params.enableSummary) {
          contents.summary = params.summaryQuery ? { query: params.summaryQuery } : true;
        }

        if (params.enableHighlights) {
          contents.highlights = {
            maxCharacters: params.highlightsMaxCharacters,
            numSentences: params.highlightsNumSentences,
            highlightsPerUrl: params.highlightsPerUrl,
            query: params.highlightsQuery,
          };
        }

        if (params.subpages) {
          contents.subpages = params.subpages;
        }

        if (params.subpageTarget) {
          contents.subpageTarget = params.subpageTarget;
        }

        const searchRequest: ExaAdvancedSearchRequest = {
          query: params.query,
          type: params.type || 'auto',
          numResults: params.numResults || 10,
          contents,
        };

        if (params.category) {
          searchRequest.category = params.category;
        }

        if (params.includeDomains && params.includeDomains.length > 0) {
          searchRequest.includeDomains = params.includeDomains;
        }

        if (params.excludeDomains && params.excludeDomains.length > 0) {
          searchRequest.excludeDomains = params.excludeDomains;
        }

        if (params.startPublishedDate) {
          searchRequest.startPublishedDate = params.startPublishedDate;
        }

        if (params.endPublishedDate) {
          searchRequest.endPublishedDate = params.endPublishedDate;
        }

        if (params.startCrawlDate) {
          searchRequest.startCrawlDate = params.startCrawlDate;
        }

        if (params.endCrawlDate) {
          searchRequest.endCrawlDate = params.endCrawlDate;
        }

        if (params.includeText && params.includeText.length > 0) {
          searchRequest.includeText = params.includeText;
        }

        if (params.excludeText && params.excludeText.length > 0) {
          searchRequest.excludeText = params.excludeText;
        }

        if (params.userLocation) {
          searchRequest.userLocation = params.userLocation;
        }

        if (params.moderation !== undefined) {
          searchRequest.moderation = params.moderation;
        }

        if (params.additionalQueries && params.additionalQueries.length > 0) {
          searchRequest.additionalQueries = params.additionalQueries;
        }

        checkpoint('web_search_advanced_request_prepared');
        logger.log("Sending advanced search request to Exa API");

        const response = await retryWithBackoff(() => exa.request<ExaSearchResponse>(
          API_CONFIG.ENDPOINTS.SEARCH,
          'POST',
          searchRequest,
          undefined,
          integrationHeaders('web-search-advanced-mcp', config)
        ));

        checkpoint('exa_advanced_search_response_received');
        logger.log("Received response from Exa API");

        if (!response) {
          logger.log("Warning: Empty response from Exa API");
          checkpoint('web_search_advanced_complete');
          return {
            content: [{
              type: "text" as const,
              text: "No search results found. Please try a different query or adjust your filters."
            }]
          };
        }

        const sanitized = sanitizeSearchResponse(response);
        const searchTime = typeof sanitized.searchTime === 'number' ? sanitized.searchTime : undefined;
        const resultText = JSON.stringify(sanitized);
        logger.log(`Response prepared with ${resultText.length} characters`);

        const result = {
          content: [{
            type: "text" as const,
            text: resultText,
            _meta: {
              searchTime: searchTime
            }
          }]
        };

        checkpoint('web_search_advanced_complete');
        logger.complete();
        return result;
      } catch (error) {
        logger.error(error);
        return formatToolError(error, 'web_search_advanced_exa', config?.userProvidedApiKey);
      }
    }
  );
}
