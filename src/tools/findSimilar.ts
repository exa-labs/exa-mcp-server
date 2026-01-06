import { z } from "zod";
import axios from "axios";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG } from "./config.js";
import { ExaSearchResponse } from "../types.js";
import { createRequestLogger } from "../utils/logger.js";
import { checkpoint } from "agnost";

export function registerFindSimilarTool(server: McpServer, config?: { exaApiKey?: string }): void {
  server.tool(
    "find_similar_exa",
    "Find web pages similar to a given URL - useful for discovering related content, competitors, similar articles, or pages with comparable topics and styles.",
    {
      url: z.string().describe("URL to find similar content for"),
      numResults: z.number().optional().describe("Number of similar results to return (1-100, default: 10)"),
      includeDomains: z.array(z.string()).optional().describe("Only include results from these domains"),
      excludeDomains: z.array(z.string()).optional().describe("Exclude results from these domains"),
      startPublishedDate: z.string().optional().describe("Only include results published after this date (ISO 8601: YYYY-MM-DD)"),
      endPublishedDate: z.string().optional().describe("Only include results published before this date (ISO 8601: YYYY-MM-DD)"),
      category: z.enum(['company', 'research paper', 'news', 'pdf', 'github', 'tweet', 'personal site', 'people', 'financial report']).optional().describe("Filter results to a specific category"),
      excludeSourceDomain: z.boolean().optional().describe("Exclude the source URL's domain from results (default: true)"),
      textMaxCharacters: z.number().optional().describe("Max characters for text extraction per result"),
      contextMaxCharacters: z.number().optional().describe("Max characters for context string (default: 10000)"),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true
    },
    async (params) => {
      const requestId = `find_similar_exa-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'find_similar_exa');

      logger.start(params.url);

      try {
        const axiosInstance = axios.create({
          baseURL: API_CONFIG.BASE_URL,
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'x-api-key': config?.exaApiKey || process.env.EXA_API_KEY || '',
            'x-exa-integration': 'find-similar-mcp'
          },
          timeout: 30000
        });

        const findSimilarRequest: Record<string, unknown> = {
          url: params.url,
          numResults: params.numResults || 10,
          excludeSourceDomain: params.excludeSourceDomain !== false, // default true
          contents: {
            text: params.textMaxCharacters ? { maxCharacters: params.textMaxCharacters } : true,
            context: { maxCharacters: params.contextMaxCharacters || 10000 },
          }
        };

        if (params.includeDomains && params.includeDomains.length > 0) {
          findSimilarRequest.includeDomains = params.includeDomains;
        }

        if (params.excludeDomains && params.excludeDomains.length > 0) {
          findSimilarRequest.excludeDomains = params.excludeDomains;
        }

        if (params.startPublishedDate) {
          findSimilarRequest.startPublishedDate = params.startPublishedDate;
        }

        if (params.endPublishedDate) {
          findSimilarRequest.endPublishedDate = params.endPublishedDate;
        }

        if (params.category) {
          findSimilarRequest.category = params.category;
        }

        checkpoint('find_similar_request_prepared');
        logger.log("Sending findSimilar request to Exa API");

        const response = await axiosInstance.post<ExaSearchResponse>(
          API_CONFIG.ENDPOINTS.FIND_SIMILAR,
          findSimilarRequest,
          { timeout: 30000 }
        );

        checkpoint('find_similar_response_received');
        logger.log("Received response from Exa API");

        if (!response.data) {
          logger.log("Warning: Empty response from Exa API");
          checkpoint('find_similar_complete');
          return {
            content: [{
              type: "text" as const,
              text: "No similar pages found for the provided URL."
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
            if (result.score) entry += `Similarity Score: ${result.score.toFixed(3)}\n`;
            if (result.publishedDate) entry += `Published: ${result.publishedDate}\n`;
            if (result.text) entry += `\n${result.text}\n`;
            return entry;
          }).join('\n---\n');
        } else {
          resultText = "No similar pages found.";
        }

        logger.log(`Response prepared with ${resultText.length} characters`);

        const result = {
          content: [{
            type: "text" as const,
            text: resultText
          }]
        };

        checkpoint('find_similar_complete');
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
              text: `Find similar error (${statusCode}): ${errorMessage}`
            }],
            isError: true,
          };
        }

        return {
          content: [{
            type: "text" as const,
            text: `Find similar error: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true,
        };
      }
    }
  );
}
