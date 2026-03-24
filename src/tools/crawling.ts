import { z } from "zod";
import { Exa } from "exa-js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG } from "./config.js";
import { createRequestLogger } from "../utils/logger.js";
import { retryWithBackoff, formatToolError } from "../utils/errorHandler.js";
import { sanitizeContentsResponse } from "../utils/exaResponseSanitizer.js";
import { checkpoint } from "agnost";

interface CrawlStatus {
  id: string;
  status: string;
  error?: { tag: string; httpStatusCode?: number | null };
}

function formatCrawlResults(results: any[], errors: CrawlStatus[]): string {
  if (results.length === 0 && errors.length === 0) return 'No content found.';
  const lines: string[] = [];
  for (const r of results) {
    lines.push(`# ${r.title || '(no title)'}`);
    lines.push(`URL: ${r.url}`);
    if (r.publishedDate) lines.push(`Published: ${r.publishedDate.split('T')[0]}`);
    if (r.author) lines.push(`Author: ${r.author}`);
    lines.push('');
    if (r.text) lines.push(r.text);
    lines.push('');
  }
  for (const err of errors) {
    lines.push(`Error fetching ${err.id}: ${err.error?.tag ?? 'unknown error'}`);
  }
  return lines.join('\n').trim();
}

export function registerCrawlingTool(server: McpServer, config?: { exaApiKey?: string; userProvidedApiKey?: boolean }): void {
  server.tool(
    "crawling_exa",
    `Read a webpage's full content as clean markdown. Use after web_search_exa when highlights are insufficient or to read any URL.

Best for: Extracting full content from known URLs. Batch multiple URLs in one call.
Returns: Clean text content and metadata from the page(s).`,
    {
      urls: z.array(z.string()).describe("URLs to read. Batch multiple URLs in one call."),
      maxCharacters: z.coerce.number().optional().describe("Maximum characters to extract per page (must be a number, default: 3000)"),
      maxAgeHours: z.coerce.number().optional().describe("Maximum age of cached content in hours. 0 = always fetch fresh content, omit = use cached content with fresh fetch fallback."),
      subpages: z.coerce.number().optional().describe("Number of subpages to also crawl from each URL."),
      subpageTarget: z.string().optional().describe("Keywords to prioritize when selecting subpages"),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true
    },
    async ({ urls, maxCharacters, maxAgeHours, subpages, subpageTarget }) => {
      const requestId = `crawling_exa-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'crawling_exa');

      logger.start(urls.join(', '));

      try {
        const exa = new Exa(config?.exaApiKey || process.env.EXA_API_KEY || '');

        const crawlRequest = {
          ids: urls,
          contents: {
            text: {
              maxCharacters: maxCharacters || API_CONFIG.DEFAULT_MAX_CHARACTERS
            },
            ...(maxAgeHours !== undefined ? { maxAgeHours } : { livecrawl: 'preferred' }),
            ...(subpages && { subpages }),
            ...(subpageTarget && { subpageTarget: [subpageTarget] }),
          }
        };

        checkpoint('crawl_request_prepared');
        logger.log("Sending crawl request to Exa API");

        const response = await retryWithBackoff(() => exa.request<any>(
          '/contents',
          'POST',
          crawlRequest,
          undefined,
          { 'x-exa-integration': 'crawling-mcp' }
        ));

        checkpoint('crawl_response_received');
        logger.log("Received response from Exa API");

        const statuses: CrawlStatus[] = Array.isArray(response?.statuses) ? response.statuses : [];
        const urlErrors = statuses.filter((s) => s.status === 'error');

        if (!response || !response.results || response.results.length === 0) {
          logger.log("Warning: Empty or invalid response from Exa API");
          checkpoint('crawl_complete');
          if (urlErrors.length > 0) {
            const msg = urlErrors.map((e) => `${e.id}: ${e.error?.tag ?? 'unknown error'}`).join('; ');
            return {
              content: [{
                type: "text" as const,
                text: `Error fetching URL(s): ${msg}`
              }],
              isError: true,
            };
          }
          return {
            content: [{
              type: "text" as const,
              text: "No content found for the provided URL(s)."
            }]
          };
        }

        logger.log(`Successfully crawled content from ${response.results.length} URL(s)`);

        const sanitized = sanitizeContentsResponse(response);
        const results = Array.isArray(sanitized.results) ? sanitized.results : [];
        const formattedText = formatCrawlResults(results, urlErrors);

        const searchTime = typeof sanitized.searchTime === 'number' ? sanitized.searchTime : undefined;

        const result = {
          content: [{
            type: "text" as const,
            text: formattedText,
            _meta: { 
              searchTime: searchTime
            }
          }]
        };

        checkpoint('crawl_complete');
        logger.complete();
        return result;
      } catch (error) {
        logger.error(error);
        return formatToolError(error, 'crawling_exa', config?.userProvidedApiKey);
      }
    }
  );
}                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                