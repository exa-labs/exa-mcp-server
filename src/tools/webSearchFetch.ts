import { z } from "zod";
import { Exa } from "exa-js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG, integrationHeaders } from "./config.js";
import { ExaContentsResponse, ExaSearchRequest, ExaSearchResponse, ExaSearchStatus } from "../types.js";
import { createRequestLogger } from "../utils/logger.js";
import { retryWithBackoff, formatToolError } from "../utils/errorHandler.js";
import { sanitizeContentsResponse, sanitizeSearchResponse } from "../utils/exaResponseSanitizer.js";
import { lenientOptionalNumber, lenientOptionalPositiveNumber, lenientString } from "./validation.js";
import { checkpoint } from "agnost";

type WebSearchFetchConfig = {
  exaApiKey?: string;
  userProvidedApiKey?: boolean;
  defaultSearchType?: "auto" | "fast";
  exaSource?: string;
  mcpSessionId?: string;
  mcpClient?: unknown;
};

type SearchCategory = NonNullable<ExaSearchRequest["category"]>;

const DEFAULT_FETCH_NUM_RESULTS = 3;
const MAX_FETCH_NUM_RESULTS = 10;
const DEFAULT_MAX_CHARACTERS = 4000;

const categorySchema = z
  .enum(["company", "research paper", "news", "pdf", "github", "personal site", "people", "financial report"])
  .optional()
  .describe("Filter results to a specific category");

function normalizeNumber(value: number | undefined, defaultValue: number, options: { allowZero?: boolean } = {}): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return defaultValue;
  }

  if (value < 0 || (!options.allowZero && value === 0)) {
    return defaultValue;
  }

  return Math.floor(value);
}

function getString(value: Record<string, unknown>, key: string): string | undefined {
  return typeof value[key] === "string" ? value[key] : undefined;
}

function formatSearchResults(results: Record<string, unknown>[]): string {
  const lines = ["# Search Results", ""];

  results.forEach((result, index) => {
    lines.push(`${index + 1}. ${getString(result, "title") || "(no title)"}`);
    lines.push(`   URL: ${getString(result, "url") || "N/A"}`);
    lines.push(`   Published: ${getString(result, "publishedDate") || "N/A"}`);
    lines.push(`   Author: ${getString(result, "author") || "N/A"}`);

    const highlights = Array.isArray(result.highlights)
      ? result.highlights.filter((highlight): highlight is string => typeof highlight === "string")
      : [];

    if (highlights.length > 0) {
      lines.push("   Highlights:");
      highlights.forEach((highlight) => lines.push(`   - ${highlight}`));
    }

    lines.push("");
  });

  return lines.join("\n").trim();
}

function formatCrawledContents(results: Record<string, unknown>[], selectedUrls: string[]): string {
  const lines = ["# Crawled Contents", ""];

  if (results.length === 0) {
    lines.push("No crawled content returned.");
    return lines.join("\n").trim();
  }

  results.forEach((result, index) => {
    const url = getString(result, "url") || selectedUrls[index] || "N/A";

    lines.push(`## ${index + 1}. ${getString(result, "title") || "(no title)"}`);
    lines.push(`URL: ${url}`);

    const publishedDate = getString(result, "publishedDate");
    if (publishedDate) {
      lines.push(`Published: ${publishedDate.split("T")[0]}`);
    }

    const author = getString(result, "author");
    if (author) {
      lines.push(`Author: ${author}`);
    }

    lines.push("");
    lines.push(getString(result, "text") || "No text content returned.");
    lines.push("");
    lines.push("---");
    lines.push("");
  });

  return lines.join("\n").trim();
}

function formatCrawlErrors(errors: ExaSearchStatus[]): string {
  if (errors.length === 0) {
    return "";
  }

  const lines = ["# Crawl Errors", ""];
  errors.forEach((error) => {
    const statusCode = error.error?.httpStatusCode ? ` (${error.error.httpStatusCode})` : "";
    lines.push(`- Error crawling ${error.id}: ${error.error?.tag || "unknown error"}${statusCode}`);
  });

  return lines.join("\n").trim();
}

export function registerWebSearchFetchTool(server: McpServer, config?: WebSearchFetchConfig): void {
  server.tool(
    "web_search_fetch_exa",
    `Search the web for a topic and immediately crawl the full content of the top results in a single call.

Best for: High-performance research tasks where you need full page contents from the top results. Reduces round-trip latency.
Returns: A list of search results accompanied by the full markdown content of the top fetched pages.`,
    {
      query: lenientString().describe("Natural language search query optimized for semantic search."),
      numResults: lenientOptionalNumber().describe("Number of search results to return (default: 10)."),
      category: categorySchema,
      fetchNumResults: lenientOptionalNumber().describe("Number of top search results to immediately fetch content for (default: 3, max: 10)."),
      maxCharacters: lenientOptionalPositiveNumber().describe("Maximum characters to extract per fetched page (default: 4000)."),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    async ({ query, numResults, category, fetchNumResults, maxCharacters }) => {
      const toolId = "web_search_fetch_exa";
      const requestId = `${toolId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, toolId);

      logger.start(query);

      try {
        const exa = new Exa(config?.exaApiKey || process.env.EXA_API_KEY || "");
        const normalizedNumResults = normalizeNumber(numResults, API_CONFIG.DEFAULT_NUM_RESULTS);
        const requestedFetchNumResults = Math.min(
          normalizeNumber(fetchNumResults, DEFAULT_FETCH_NUM_RESULTS, { allowZero: true }),
          MAX_FETCH_NUM_RESULTS,
        );
        const normalizedMaxCharacters = normalizeNumber(maxCharacters, DEFAULT_MAX_CHARACTERS);

        const searchRequest: ExaSearchRequest = {
          query,
          type: config?.defaultSearchType || "auto",
          numResults: normalizedNumResults,
          ...(category && { category: category as SearchCategory }),
          contents: {
            highlights: true,
          },
        };

        checkpoint("web_search_fetch_search_request_prepared");
        logger.log("Sending search request to Exa API");

        const searchResponse = await retryWithBackoff(() =>
          exa.request<ExaSearchResponse>(
            API_CONFIG.ENDPOINTS.SEARCH,
            "POST",
            searchRequest,
            undefined,
            integrationHeaders("web-search-fetch-mcp", config),
          ),
        );

        checkpoint("web_search_fetch_search_response_received");
        logger.log("Received search response from Exa API");

        const sanitizedSearch = sanitizeSearchResponse(searchResponse);
        const searchResults = Array.isArray(sanitizedSearch.results) ? sanitizedSearch.results : [];

        if (searchResults.length === 0) {
          checkpoint("web_search_fetch_complete");
          return {
            content: [{
              type: "text" as const,
              text: "No search results found for query. Scrape phase bypassed.",
            }],
          };
        }

        const adjustedFetchNumResults = Math.min(requestedFetchNumResults, searchResults.length);
        const selectedUrls = searchResults
          .slice(0, adjustedFetchNumResults)
          .map((result) => getString(result, "url"))
          .filter((url): url is string => Boolean(url));

        const sections = [formatSearchResults(searchResults)];
        let sanitizedContents: Record<string, unknown> = {};
        let crawlErrors: ExaSearchStatus[] = [];

        if (adjustedFetchNumResults === 0) {
          sections.push("# Crawled Contents\n\nScrape phase bypassed because fetchNumResults was set to 0.");
        } else if (selectedUrls.length === 0) {
          sections.push("# Crawled Contents\n\nScrape phase bypassed because no result URLs were available.");
        } else {
          const crawlRequest = {
            ids: selectedUrls,
            contents: {
              text: {
                maxCharacters: normalizedMaxCharacters,
              },
            },
          };

          checkpoint("web_search_fetch_crawl_request_prepared");
          logger.log(`Sending crawl request for ${selectedUrls.length} URL(s) to Exa API`);

          const contentsResponse = await retryWithBackoff(() =>
            exa.request<ExaContentsResponse>(
              "/contents",
              "POST",
              crawlRequest,
              undefined,
              integrationHeaders("web-search-fetch-mcp", config),
            ),
          );

          checkpoint("web_search_fetch_crawl_response_received");
          logger.log("Received crawl response from Exa API");

          const rawStatuses = Array.isArray(contentsResponse?.statuses) ? contentsResponse.statuses : [];
          crawlErrors = rawStatuses.filter((status) => status.status === "error");
          sanitizedContents = sanitizeContentsResponse(contentsResponse);
          const crawledResults = Array.isArray(sanitizedContents.results) ? sanitizedContents.results : [];

          sections.push(formatCrawledContents(crawledResults, selectedUrls));

          const formattedErrors = formatCrawlErrors(crawlErrors);
          if (formattedErrors) {
            sections.push(formattedErrors);
          }
        }

        const meta: Record<string, unknown> = {};
        if (typeof sanitizedSearch.searchTime === "number") {
          meta.searchTime = sanitizedSearch.searchTime;
        }
        if (typeof sanitizedContents.searchTime === "number") {
          meta.crawlTime = sanitizedContents.searchTime;
        }
        if (sanitizedSearch.costDollars) {
          meta.searchCostDollars = sanitizedSearch.costDollars;
        }
        if (sanitizedContents.costDollars) {
          meta.crawlCostDollars = sanitizedContents.costDollars;
        }

        const result = {
          content: [{
            type: "text" as const,
            text: sections.join("\n\n---\n\n"),
            _meta: meta,
          }],
        };

        checkpoint("web_search_fetch_complete");
        logger.complete();
        return result;
      } catch (error) {
        logger.error(error);
        return formatToolError(error, toolId, config?.userProvidedApiKey);
      }
    },
  );
}
