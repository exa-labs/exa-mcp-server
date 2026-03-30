import { z } from "zod";
import { Exa } from "exa-js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG } from "./config.js";
import { ExaDeepSearchRequest, ExaDeepSearchResponse } from "../types.js";
import { createRequestLogger } from "../utils/logger.js";
import { retryWithBackoff, formatToolError } from "../utils/errorHandler.js";
import { sanitizeDeepSearchStructuredResponse } from "../utils/exaResponseSanitizer.js";
import { checkpoint } from "agnost";

export function registerDeepSearchTool(server: McpServer, config?: { exaApiKey?: string; userProvidedApiKey?: boolean }): void {
  server.tool(
    "deep_search_exa",
    `[Deprecated: Use web_search_advanced_exa instead] Deep search with automatic query expansion for thorough research. Generates multiple search variations to find results from multiple angles, then synthesizes a short answer with citations.

Best for: Complex questions needing information from multiple angles.
Returns: A synthesized answer with citations, plus individual search results with highlights. When structuredOutput is enabled, returns structured JSON instead of markdown.
Note: Requires an Exa API key. 'deep' mode takes 4-12s, 'deep-reasoning' takes 12-50s.`,
    {
      objective: z.string().describe("Natural language description of what the web search is looking for. Try to make the search query atomic - looking for a specific piece of information."),
      search_queries: z.array(z.string()).optional().describe("Optional list of keyword search queries related to the objective. Limited to 5 entries of up to 5 words each (~200 characters)."),
      type: z.enum(['deep', 'deep-reasoning']).optional().describe("Search depth - 'deep': fast deep search (4-12s, default), 'deep-reasoning': thorough with reasoning (12-50s)"),
      numResults: z.coerce.number().optional().describe("Number of search results to return (must be a number, default: 8)"),
      highlightMaxCharacters: z.coerce.number().min(1).optional().describe("Maximum characters for highlights per result (must be a positive number, default: 4000)"),
      outputSchema: z.record(z.string(), z.unknown()).optional().describe("JSON schema for structured output. Must include a 'type' field set to 'object' or 'text'. For 'object' type, optionally include 'properties' and 'required'. Max 10 total properties, max nesting depth 2. When provided, automatically enables structured output mode."),
      systemPrompt: z.string().max(32000).optional().describe("Instructions for how the deep search agent should process and format results."),
      structuredOutput: z.boolean().optional().describe("When true, returns a structured JSON response instead of markdown. The API will determine the appropriate structure based on the query. Prefer using outputSchema for more control over the response shape."),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: false
    },
    async ({ objective, search_queries, type, numResults, highlightMaxCharacters, outputSchema, systemPrompt, structuredOutput }) => {
      const requestId = `deep_search_exa-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'deep_search_exa');

      logger.start(objective);

      try {
        const exa = new Exa(config?.exaApiKey || process.env.EXA_API_KEY || '');

        const searchRequest: ExaDeepSearchRequest = {
          query: objective,
          type: type || "deep",
          numResults: numResults || API_CONFIG.DEFAULT_NUM_RESULTS,
          contents: {
            highlights: {
              maxCharacters: highlightMaxCharacters || 4000
            }
          }
        };

        if (outputSchema) {
          searchRequest.outputSchema = outputSchema;
          logger.log("Using custom output schema");
        } else if (structuredOutput) {
          searchRequest.outputSchema = { type: "object" };
          logger.log("Using default structured output");
        }

        if (systemPrompt) {
          searchRequest.systemPrompt = systemPrompt;
          logger.log("Using system prompt");
        }

        if (search_queries && search_queries.length > 0) {
          searchRequest.additionalQueries = search_queries;
          logger.log(`Using ${search_queries.length} additional queries`);
        } else {
          logger.log("Using automatic query expansion");
        }

        checkpoint('deep_search_request_prepared');
        logger.log("Sending deep search request to Exa API");

        const response = await retryWithBackoff(() => exa.request<ExaDeepSearchResponse>(
          API_CONFIG.ENDPOINTS.SEARCH,
          'POST',
          searchRequest,
          undefined,
          { 'x-exa-integration': 'deep-search-mcp' }
        ));

        checkpoint('deep_search_response_received');
        logger.log("Received response from Exa API");

        if (!response) {
          logger.log("Warning: Empty response from Exa API");
          checkpoint('deep_search_complete');
          return {
            content: [{
              type: "text" as const,
              text: "No search results found. Please try a different query."
            }]
          };
        }

        const data = response;

        // When structured output was requested (via outputSchema or structuredOutput flag), return the raw JSON response
        if (outputSchema || structuredOutput) {
          const structuredResponse = sanitizeDeepSearchStructuredResponse(data);

          const text = JSON.stringify(structuredResponse, null, 2);
          logger.log(`Structured response prepared with ${text.length} characters`);

          const result = {
            content: [{
              type: "text" as const,
              text
            }]
          };

          checkpoint('deep_search_complete');
          logger.complete();
          return result;
        }

        const parts: string[] = [];

        // Synthesized answer
        if (data.output?.content && typeof data.output.content === 'string') {
          parts.push(`## Answer\n\n${data.output.content}`);
        }

        // Citations from grounding (aggregated into a single section)
        if (data.output?.grounding) {
          const allCitations: string[] = [];
          for (const g of data.output.grounding) {
            if (g.citations && g.citations.length > 0) {
              allCitations.push(...g.citations.map(c => `- [${c.title}](${c.url})`));
            }
          }
          if (allCitations.length > 0) {
            parts.push(`## Citations\n\n${allCitations.join('\n')}`);
          }
        }

        // Individual results as markdown
        if (data.results && data.results.length > 0) {
          const resultLines = data.results.map((r, i) => {
            const lines: string[] = [];
            lines.push(`### ${i + 1}. ${r.title || 'Untitled'}`);
            lines.push(`**URL:** ${r.url}`);
            if (r.publishedDate) {
              lines.push(`**Published:** ${r.publishedDate}`);
            }
            if (r.image) {
              lines.push(`**Image:** ${r.image}`);
            }
            if (r.highlights && r.highlights.length > 0) {
              lines.push(`\n${r.highlights.join('\n\n')}`);
            }
            return lines.join('\n');
          });
          parts.push(`## Results\n\n${resultLines.join('\n\n---\n\n')}`);
        }

        const searchTime = typeof data.searchTime === 'number' ? data.searchTime : undefined;

        const text = parts.length > 0
          ? parts.join('\n\n---\n\n')
          : "No results found. Please try a different query.";

        logger.log(`Response prepared with ${text.length} characters`);

        const result = {
          content: [{
            type: "text" as const,
            text,
            _meta: {
              searchTime: searchTime
            }
          }]
        };

        checkpoint('deep_search_complete');
        logger.complete();
        return result;
      } catch (error) {
        checkpoint('deep_search_complete');
        logger.error(error);
        return formatToolError(error, 'deep_search_exa', config?.userProvidedApiKey);
      }
    }
  );
}
