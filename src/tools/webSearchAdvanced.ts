import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG, createExaClient, integrationHeaders } from "./config.js";
import { ExaAdvancedSearchRequest, ExaSearchResponse } from "../types.js";
import { createRequestLogger } from "../utils/logger.js";
import { retryWithBackoff, formatToolError, withTimeout } from "../utils/errorHandler.js";
import { sanitizeSearchNotices, sanitizeSearchResponse } from "../utils/exaResponseSanitizer.js";
import {
  lenientString,
  lenientOptionalNumber,
  lenientOptionalPositiveNumber,
  lenientOptionalBoolean,
} from "./validation.js";
import {
  logSearchWarnings,
  withNoticeMessages,
  withStructuredSearchNotices,
} from "./searchNotes.js";
import { checkpoint } from "agnost";

/**
 * Request fields the `lite` search type serves. The API rejects a `lite`
 * request that sets any other field with a 400 rather than ignoring it.
 */
const LITE_REQUEST_FIELDS: ReadonlySet<string> = new Set([
  "query",
  "type",
  "numResults",
  "category",
  "contents",
  "includeDomains",
  "excludeDomains",
  "startPublishedDate",
  "endPublishedDate",
  "userLocation",
  "moderation",
]);

/** `contents` options the `lite` search type serves, each with all of its own options. */
const LITE_CONTENTS_FIELDS: ReadonlySet<string> = new Set(["text", "highlights"]);

/** This tool's parameter behind each request field that `lite` rejects. */
const LITE_REJECTED_FIELD_PARAMETERS: Readonly<Record<string, string>> = {
  startCrawlDate: "startCrawlDate",
  endCrawlDate: "endCrawlDate",
  includeText: "includeText",
  excludeText: "excludeText",
  additionalQueries: "additionalQueries",
  "contents.context": "contextMaxCharacters",
  "contents.summary": "enableSummary",
  "contents.maxAgeHours": "maxAgeHours",
  "contents.livecrawlTimeout": "livecrawlTimeout",
  "contents.subpages": "subpages",
  "contents.subpageTarget": "subpageTarget",
};

/** Names of the fields of `record` that are set (not null or undefined) and not in `allowed`. */
function fieldsOutside(record: object, allowed: ReadonlySet<string>): string[] {
  return Object.entries(record)
    .filter(([field, value]) => value != null && !allowed.has(field))
    .map(([field]) => field);
}

/**
 * The tool parameters behind the fields of `request` that the `lite` search
 * type does not serve, top-level fields first; empty unless the request is a
 * `lite` search. Judged on the request as it would be sent, so no parameter
 * mapping can slip a rejected field past it.
 */
export function liteUnsupportedParameters(request: ExaAdvancedSearchRequest): string[] {
  if (request.type !== "lite") {
    return [];
  }

  const fields = [
    ...fieldsOutside(request, LITE_REQUEST_FIELDS),
    ...fieldsOutside(request.contents, LITE_CONTENTS_FIELDS).map((field) => `contents.${field}`),
  ];
  return [...new Set(fields.map((field) => LITE_REJECTED_FIELD_PARAMETERS[field] ?? field))];
}

/** The error result for a `lite` search that sets parameters `lite` does not serve. */
function liteRefusal(parameters: readonly string[]) {
  const pronoun = parameters.length === 1 ? "it" : "them";
  return {
    content: [
      {
        type: "text" as const,
        text: `web_search_advanced_exa error: search type 'lite' does not support ${parameters.join(", ")}. Remove ${pronoun}, or set type to 'auto'.`,
      },
    ],
    isError: true as const,
  };
}

export function registerWebSearchAdvancedTool(
  server: McpServer,
  config?: { exaApiKey?: string; userProvidedApiKey?: boolean },
): void {
  server.tool(
    "web_search_advanced_exa",
    `Advanced web search with full control over filters, domains, dates, and content options.

Best for: When you need specific filters like date ranges, domain restrictions, or category filters.
Not recommended for: Simple searches - use web_search_exa instead.
Returns: Search results with optional highlights, summaries, and subpage content.`,
    {
      query: lenientString().describe("Search query - can be a question, statement, or keywords"),
      numResults: lenientOptionalNumber().describe("Number of results (1-100, default: 10)"),
      type: z
        .enum(["auto", "lite", "fast", "instant"])
        .optional()
        .describe(
          "Search type. 'auto' is the default and recommended type. It returns high-quality results and supports every parameter. 'lite' is the low-cost, low-latency type and serves cached content. It supports only query, numResults, category, includeDomains, excludeDomains, startPublishedDate, endPublishedDate, userLocation, moderation, textMaxCharacters and the highlights parameters. 'instant' and 'fast' are legacy types. Use 'lite' instead of 'instant'. Use 'lite' instead of 'fast', or 'auto' when the search needs a parameter 'lite' does not support.",
        ),

      category: z
        .enum([
          "company",
          "publication",
          "news",
          "pdf",
          "github",
          "personal site",
          "people",
          "financial report",
        ])
        .optional()
        .describe("Filter results to a specific category"),

      includeDomains: z
        .array(z.string())
        .optional()
        .describe("Only include results from these domains (e.g., ['arxiv.org', 'github.com'])"),
      excludeDomains: z.array(z.string()).optional().describe("Exclude results from these domains"),

      startPublishedDate: z
        .string()
        .optional()
        .describe("Only include results published after this date (ISO 8601: YYYY-MM-DD)"),
      endPublishedDate: z
        .string()
        .optional()
        .describe("Only include results published before this date (ISO 8601: YYYY-MM-DD)"),
      startCrawlDate: z
        .string()
        .optional()
        .describe("Only include results crawled after this date (ISO 8601: YYYY-MM-DD)"),
      endCrawlDate: z
        .string()
        .optional()
        .describe("Only include results crawled before this date (ISO 8601: YYYY-MM-DD)"),

      includeText: z
        .array(z.string())
        .optional()
        .describe("Only include results containing ALL of these text strings"),
      excludeText: z
        .array(z.string())
        .optional()
        .describe("Exclude results containing ANY of these text strings"),

      userLocation: z
        .string()
        .optional()
        .describe("ISO country code for geo-targeted results (e.g., 'US', 'GB', 'DE')"),

      moderation: lenientOptionalBoolean().describe("Filter out unsafe/inappropriate content"),

      additionalQueries: z
        .array(z.string())
        .optional()
        .describe("Additional query variations to expand search coverage"),

      textMaxCharacters: lenientOptionalPositiveNumber().describe(
        "Max characters for text extraction per result",
      ),
      contextMaxCharacters: lenientOptionalPositiveNumber().describe(
        "Max characters for context string (not included by default)",
      ),

      enableSummary: lenientOptionalBoolean().describe("Enable summary generation for results"),
      summaryQuery: z.string().optional().describe("Focus query for summary generation"),

      enableHighlights: lenientOptionalBoolean().describe("Enable highlights extraction"),
      highlightsMaxCharacters: lenientOptionalNumber().describe(
        "Maximum total characters across all highlights per URL. Preferred over highlightsNumSentences.",
      ),
      highlightsNumSentences: lenientOptionalNumber().describe(
        "Deprecated. Use highlightsMaxCharacters instead.",
      ),
      highlightsPerUrl: lenientOptionalNumber().describe(
        "Deprecated and ignored. Use highlightsMaxCharacters instead.",
      ),
      highlightsQuery: z.string().optional().describe("Query for highlight relevance"),

      maxAgeHours: lenientOptionalNumber().describe(
        "Maximum age of cached content in hours. 0 = always fetch fresh content, omit = use cached content with fresh fetch fallback",
      ),
      livecrawlTimeout: lenientOptionalNumber().describe(
        "Timeout in milliseconds for fetching fresh content when maxAgeHours triggers a live fetch",
      ),

      subpages: lenientOptionalNumber().describe(
        "Number of subpages to crawl from each result (1-10)",
      ),
      subpageTarget: z
        .array(z.string())
        .optional()
        .describe("Keywords to target when selecting subpages"),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: true,
      idempotentHint: true,
    },
    async (params) => {
      const logger = createRequestLogger("web_search_advanced_exa");

      logger.start(params.query);

      try {
        const exa = createExaClient(config);

        // `lite` serves cached content only and rejects every freshness
        // option, so a `lite` search gets no livecrawl default.
        const freshness =
          params.maxAgeHours !== undefined
            ? { maxAgeHours: params.maxAgeHours }
            : params.type === "lite"
              ? {}
              : { livecrawl: "fallback" as const };

        const contents: ExaAdvancedSearchRequest["contents"] = {
          text: params.textMaxCharacters ? { maxCharacters: params.textMaxCharacters } : true,
          ...freshness,
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
          type: params.type || "auto",
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

        const liteUnsupported = liteUnsupportedParameters(searchRequest);
        if (liteUnsupported.length > 0) {
          logger.log(`Refusing lite search that sets ${liteUnsupported.join(", ")}`);
          checkpoint("web_search_advanced_complete");
          return liteRefusal(liteUnsupported);
        }

        checkpoint("web_search_advanced_request_prepared");
        logger.log("Sending advanced search request to Exa API");

        const response = await withTimeout(
          () =>
            retryWithBackoff(() =>
              exa.request<ExaSearchResponse>(
                API_CONFIG.ENDPOINTS.SEARCH,
                "POST",
                searchRequest,
                undefined,
                integrationHeaders("web-search-advanced-mcp", config),
              ),
            ),
          API_CONFIG.TOOL_TIMEOUTS.ADVANCED_SEARCH_MS,
          "web_search_advanced_exa",
        );

        checkpoint("exa_advanced_search_response_received");
        logger.log("Received response from Exa API");
        logSearchWarnings(response, logger);

        if (!response) {
          logger.log("Warning: Empty response from Exa API");
          checkpoint("web_search_advanced_complete");
          return {
            content: [
              {
                type: "text" as const,
                text: "No search results found. Please try a different query or adjust your filters.",
              },
            ],
          };
        }

        let sanitized = sanitizeSearchResponse(response);
        const searchTime =
          typeof sanitized.searchTime === "number" ? sanitized.searchTime : undefined;
        const notices = sanitizeSearchNotices(response.notices);
        const resultText = JSON.stringify(withNoticeMessages(sanitized, notices));
        logger.log(`Response prepared with ${resultText.length} characters`);

        const result = {
          content: [
            {
              type: "text" as const,
              text: resultText,
              _meta: {
                searchTime: searchTime,
              },
            },
          ],
        };

        checkpoint("web_search_advanced_complete");
        logger.complete();
        return withStructuredSearchNotices(result, sanitized, notices);
      } catch (error) {
        logger.error(error);
        return formatToolError(error, "web_search_advanced_exa", config?.userProvidedApiKey);
      }
    },
  );
}
