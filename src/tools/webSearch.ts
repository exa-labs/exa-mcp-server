import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG, createExaClient, integrationHeaders } from "./config.js";
import { ExaSearchRequest, ExaSearchResponse } from "../types.js";
import { createRequestLogger } from "../utils/logger.js";
import { retryWithBackoff, formatToolError, withTimeout } from "../utils/errorHandler.js";
import { sanitizeSearchNotices, sanitizeSearchResponse } from "../utils/exaResponseSanitizer.js";
import { lenientString, lenientOptionalNumber } from "./validation.js";
import { logSearchWarnings, withSearchNotices } from "./searchNotes.js";
import { checkpoint } from "agnost";

type WebSearchConfig = {
  exaApiKey?: string;
  userProvidedApiKey?: boolean;
  defaultSearchType?: "auto" | "lite" | "fast" | "instant";
  exaSource?: string;
  mcpSessionId?: string;
};

const WEB_SEARCH_DESCRIPTION = `Search the web for any topic and get clean, ready-to-use content.

      Best for: Finding current information, news, facts, people, companies, or answering questions about any topic.
      Returns: Clean text content from top search results.

      Query tips:
      describe the ideal page, not keywords. "blog post comparing React and Vue performance" not "React vs Vue".
      Use category:people / category:company to search through Linkedin profiles / companies respectively.
      If highlights are insufficient, follow up with web_fetch_exa on the best URLs.`;

const WEB_SEARCH_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
  idempotentHint: true,
};

type WebSearchArgs = {
  query: string;
  numResults?: number;
};

export function registerWebSearchTool(
  server: McpServer,
  config?: WebSearchConfig,
  toolName?: string,
): void {
  const toolId = toolName || "web_search_exa";

  const handler = async (args: WebSearchArgs) => {
    const { query, numResults } = args;
    const logger = createRequestLogger(toolId);

    // Extract category:<type> from query string if present
    const categoryMatch = query.match(
      /\bcategory:(company|publication|news|personal\s*site|people)\b/i,
    );
    const category = categoryMatch
      ? (categoryMatch[1].toLowerCase().replace(/\s+/g, " ") as
          | "company"
          | "publication"
          | "news"
          | "personal site"
          | "people")
      : undefined;
    const cleanedQuery = categoryMatch
      ? query.replace(categoryMatch[0], "").replace(/\s+/g, " ").trim()
      : query;

    logger.start(cleanedQuery);

    try {
      const exa = createExaClient(config);

      const searchRequest: ExaSearchRequest = {
        query: cleanedQuery,
        type: config?.defaultSearchType || "auto",
        numResults: numResults || API_CONFIG.DEFAULT_NUM_RESULTS,
        ...(category && { category }),
        contents: {
          highlights: true,
        },
      };

      const headers = integrationHeaders("web-search-mcp", config);

      checkpoint("web_search_request_prepared");
      logger.log("Sending request to Exa API");

      const response = await withTimeout(
        () =>
          retryWithBackoff(() =>
            exa.request<ExaSearchResponse>(
              API_CONFIG.ENDPOINTS.SEARCH,
              "POST",
              searchRequest,
              undefined,
              headers,
            ),
          ),
        API_CONFIG.TOOL_TIMEOUTS.SEARCH_MS,
        toolId,
      );

      checkpoint("exa_search_response_received");
      logger.log("Received response from Exa API");
      logSearchWarnings(response, logger);
      const notices = sanitizeSearchNotices(response?.notices);

      if (!response || !response.results || response.results.length === 0) {
        logger.log("Warning: Empty or invalid response from Exa API");
        checkpoint("web_search_complete");
        const noResults = {
          content: [
            {
              type: "text" as const,
              text: "No search results found. Please try a different query.",
            },
          ],
        };
        return withSearchNotices(noResults, notices, { results: [] });
      }

      logger.log(`Received ${response.results.length} results with highlights`);

      const sanitized = sanitizeSearchResponse(response);
      const results = Array.isArray(sanitized.results) ? sanitized.results : [];

      const formattedResults = results
        .map((r) => {
          const lines = [
            `Title: ${r.title || "N/A"}`,
            `URL: ${r.url}`,
            `Published: ${r.publishedDate || "N/A"}`,
            `Author: ${r.author || "N/A"}`,
          ];
          if (Array.isArray(r.highlights) && r.highlights.length > 0) {
            lines.push(`Highlights:\n${r.highlights.join("\n")}`);
          } else if (r.text) {
            lines.push(`Text: ${r.text}`);
          }
          return lines.join("\n");
        })
        .join("\n\n---\n\n");

      const searchTime =
        typeof sanitized.searchTime === "number" ? sanitized.searchTime : undefined;

      const result = {
        content: [
          {
            type: "text" as const,
            text: formattedResults,
            _meta: {
              searchTime: searchTime,
            },
          },
        ],
      };

      checkpoint("web_search_complete");
      logger.complete();
      return withSearchNotices(result, notices, { results });
    } catch (error) {
      logger.error(error);
      return formatToolError(error, toolId, config?.userProvidedApiKey);
    }
  };

  const queryParam = lenientString().describe(
    "Natural language search query. Should be a semantically rich description of the ideal page, not just keywords. Optionally include category:<type> (company, people) to focus results — e.g. 'category:people John Doe software engineer'.",
  );
  const numResultsParam = lenientOptionalNumber().describe(
    "Number of search results to return (default: 10).",
  );

  server.registerTool(
    toolId,
    {
      title: toolId === "web_search_exa" ? "Web Search" : undefined,
      description: WEB_SEARCH_DESCRIPTION,
      inputSchema: {
        query: queryParam,
        numResults: numResultsParam,
      },
      annotations: WEB_SEARCH_ANNOTATIONS,
    },
    handler,
  );
}
