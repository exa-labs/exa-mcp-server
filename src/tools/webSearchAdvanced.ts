import { z } from "zod";
import axios from "axios";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG } from "./config.js";
import { ExaAdvancedSearchRequest, ExaSearchResponse } from "../types.js";
import { createRequestLogger } from "../utils/logger.js";
import { handleRateLimitError } from "../utils/errorHandler.js";
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
      type: z.enum(['auto', 'fast', 'neural']).optional().describe("Search type - 'auto': balanced (default), 'fast': quick results, 'neural': semantic search"),

      category: z.enum(['company', 'research paper', 'news', 'pdf', 'github', 'tweet', 'personal site', 'people', 'financial report']).optional().describe("Filter results to a specific category"),

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

      textMaxCharacters: z.coerce.number().optional().describe("Max characters for text extraction per result (must be a number)"),
      contextMaxCharacters: z.coerce.number().optional().describe("Max characters for context string (must be a number, default: 10000)"),

      enableSummary: z.boolean().optional().describe("Enable summary generation for results"),
      summaryQuery: z.string().optional().describe("Focus query for summary generation"),

      enableHighlights: z.boolean().optional().describe("Enable highlights extraction"),
      highlightsNumSentences: z.coerce.number().optional().describe("Number of sentences per highlight (must be a number)"),
      highlightsPerUrl: z.coerce.number().optional().describe("Number of highlights per URL (must be a number)"),
      highlightsQuery: z.string().optional().describe("Query for highlight relevance"),

      livecrawl: z.enum(['never', 'fallback', 'always', 'preferred']).optional().describe("Live crawl mode - 'never': only cached, 'fallback': cached then live, 'always': always live, 'preferred': prefer live (default: 'fallback')"),
      livecrawlTimeout: z.coerce.number().optional().describe("Timeout for live crawl in milliseconds (must be a number)"),

      subpages: z.coerce.number().optional().describe("Number of subpages to crawl from each result (must be a number, 1-10)"),
      subpageTarget: z.array(z.string()).optional().describe("Keywords to target when selecting subpages"),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true
    },
    async (params) => {
      const requestId = `web_search_advanced_exa-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'web_search_advanced_exa');

      logger.start(params.query);

      try {
        const axiosInstance = axios.create({
          baseURL: API_CONFIG.BASE_URL,
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'x-api-key': config?.exaApiKey || process.env.EXA_API_KEY || '',
            'x-exa-integration': 'web-search-advanced-mcp'
          },
          timeout: params.livecrawlTimeout || 30000
        });

        const contents: ExaAdvancedSearchRequest['contents'] = {
          text: params.textMaxCharacters ? { maxCharacters: params.textMaxCharacters } : true,
          context: { maxCharacters: params.contextMaxCharacters || 10000 },
          livecrawl: params.livecrawl || 'fallback',
        };

        if (params.livecrawlTimeout) {
          contents.livecrawlTimeout = params.livecrawlTimeout;
        }

        if (params.enableSummary) {
          contents.summary = params.summaryQuery ? { query: params.summaryQuery } : true;
        }

        if (params.enableHighlights) {
          contents.highlights = {
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

        const response = await axiosInstance.post<ExaSearchResponse>(
          API_CONFIG.ENDPOINTS.SEARCH,
          searchRequest,
          { timeout: params.livecrawlTimeout || 30000 }
        );

        checkpoint('exa_advanced_search_response_received');
        logger.log("Received response from Exa API");

        if (!response.data) {
          logger.log("Warning: Empty response from Exa API");
          checkpoint('web_search_advanced_complete');
          return {
            content: [{
              type: "text" as const,
              text: "No search results found. Please try a different query or adjust your filters."
            }]
          };
        }

        let resultText = '';

        if (response.data.context) {
          resultText = response.data.context;
        } else if (response.data.results && response.data.results.length > 0) {
          resultText = response.data.results.map((result, index) => {
            let entry = `## ${index + 1}. ${result.title || 'Untitled'}\n`;
            entry += `URL: ${result.url}\n`;
            if (result.publishedDate) entry += `Published: ${result.publishedDate}\n`;
            if (result.author) entry += `Author: ${result.author}\n`;
            if (result.summary) entry += `\nSummary: ${result.summary}\n`;
            if (result.text) entry += `\n${result.text}\n`;
            return entry;
          }).join('\n---\n');
        } else {
          resultText = "No results found for the given query and filters.";
        }

        logger.log(`Response prepared with ${resultText.length} characters`);

        const result = {
          content: [{
            type: "text" as const,
            text: resultText
          }]
        };

        checkpoint('web_search_advanced_complete');
        logger.complete();
        return result;
      } catch (error) {
        logger.error(error);

        // Check for rate limit error on free MCP
        const rateLimitResult = handleRateLimitError(error, config?.userProvidedApiKey, 'web_search_advanced_exa');
        if (rateLimitResult) {
          return rateLimitResult;
        }

        if (axios.isAxiosError(error)) {
          const statusCode = error.response?.status || 'unknown';
          const errorMessage = error.response?.data?.message || error.message;

          logger.log(`Axios error (${statusCode}): ${errorMessage}`);
          return {
            content: [{
              type: "text" as const,
              text: `Advanced search error (${statusCode}): ${errorMessage}`
            }],
            isError: true,
          };
        }

        return {
          content: [{
            type: "text" as const,
            text: `Advanced search error: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true,
        };
      }
    }
  );
}
