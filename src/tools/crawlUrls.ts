import { z } from "zod";
import axios from "axios";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG } from "./config.js";
import { createRequestLogger } from "../utils/logger.js";
import { checkpoint } from "agnost";

interface CrawlResult {
  id: string;
  url: string;
  title?: string;
  author?: string;
  publishedDate?: string;
  text?: string;
  summary?: string;
  highlights?: string[];
  image?: string;
  favicon?: string;
}

interface CrawlResponse {
  requestId: string;
  results: CrawlResult[];
}

export function registerCrawlUrlsTool(server: McpServer, config?: { exaApiKey?: string }): void {
  server.tool(
    "crawl_urls_exa",
    "Crawl and extract content from one or more URLs - retrieves full text, metadata, summaries, and highlights. Supports batch URL processing and advanced content extraction options.",
    {
      urls: z.array(z.string()).describe("URLs to crawl (can be a single URL or multiple)"),
      textMaxCharacters: z.number().optional().describe("Max characters for text extraction per URL"),
      enableSummary: z.boolean().optional().describe("Generate a summary for each page"),
      summaryQuery: z.string().optional().describe("Focus query for summary generation"),
      enableHighlights: z.boolean().optional().describe("Extract key highlights from each page"),
      highlightsNumSentences: z.number().optional().describe("Number of sentences per highlight"),
      highlightsPerUrl: z.number().optional().describe("Number of highlights per URL"),
      highlightsQuery: z.string().optional().describe("Query for highlight relevance"),
      livecrawl: z.enum(['never', 'fallback', 'always', 'preferred']).optional().describe("Live crawl mode - 'never': only cached, 'fallback': cached then live, 'always': always live, 'preferred': prefer live (default: 'preferred')"),
      livecrawlTimeout: z.number().optional().describe("Timeout for live crawl in milliseconds"),
      subpages: z.number().optional().describe("Number of subpages to crawl from each URL (1-10)"),
      subpageTarget: z.array(z.string()).optional().describe("Keywords to target when selecting subpages"),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true
    },
    async (params) => {
      const requestId = `crawl_urls_exa-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'crawl_urls_exa');

      logger.start(`Crawling ${params.urls.length} URL(s)`);

      try {
        const axiosInstance = axios.create({
          baseURL: API_CONFIG.BASE_URL,
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'x-api-key': config?.exaApiKey || process.env.EXA_API_KEY || '',
            'x-exa-integration': 'crawl-urls-mcp'
          },
          timeout: params.livecrawlTimeout || 60000
        });

        // Build contents configuration
        const contents: Record<string, unknown> = {
          text: params.textMaxCharacters ? { maxCharacters: params.textMaxCharacters } : true,
          livecrawl: params.livecrawl || 'preferred',
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

        const crawlRequest = {
          ids: params.urls,
          contents,
        };

        checkpoint('crawl_urls_request_prepared');
        logger.log("Sending crawl request to Exa API");

        const response = await axiosInstance.post<CrawlResponse>(
          API_CONFIG.ENDPOINTS.CONTENTS,
          crawlRequest,
          { timeout: params.livecrawlTimeout || 60000 }
        );

        checkpoint('crawl_urls_response_received');
        logger.log("Received response from Exa API");

        if (!response.data || !response.data.results || response.data.results.length === 0) {
          logger.log("Warning: No content found in response");
          checkpoint('crawl_urls_complete');
          return {
            content: [{
              type: "text" as const,
              text: "No content found for the provided URL(s)."
            }]
          };
        }

        // Format results
        let resultText = response.data.results.map((result, index) => {
          let entry = `## ${index + 1}. ${result.title || 'Untitled'}\n`;
          entry += `URL: ${result.url}\n`;
          if (result.author) entry += `Author: ${result.author}\n`;
          if (result.publishedDate) entry += `Published: ${result.publishedDate}\n`;

          if (result.summary) {
            entry += `\n### Summary\n${result.summary}\n`;
          }

          if (result.highlights && result.highlights.length > 0) {
            entry += `\n### Highlights\n`;
            result.highlights.forEach((highlight, i) => {
              entry += `- ${highlight}\n`;
            });
          }

          if (result.text) {
            entry += `\n### Content\n${result.text}\n`;
          }

          return entry;
        }).join('\n---\n\n');

        logger.log(`Response prepared with ${resultText.length} characters`);

        const result = {
          content: [{
            type: "text" as const,
            text: resultText
          }]
        };

        checkpoint('crawl_urls_complete');
        logger.complete();
        return result;
      } catch (error) {
        logger.error(error);

        if (axios.isAxiosError(error)) {
          const statusCode = error.response?.status || 'unknown';
          const errorMessage = error.response?.data?.message || error.message;

          logger.log(`Axios error (${statusCode}): ${errorMessage}`);
          return {
            content: [{
              type: "text" as const,
              text: `Crawl URLs error (${statusCode}): ${errorMessage}`
            }],
            isError: true,
          };
        }

        return {
          content: [{
            type: "text" as const,
            text: `Crawl URLs error: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true,
        };
      }
    }
  );
}
