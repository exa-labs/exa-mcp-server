import { z } from "zod";
import axios from "axios";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG } from "./config.js";
import { ExaSearchRequest, ExaSearchResponse } from "../types.js";
import { createRequestLogger } from "../utils/logger.js";

export function registerGithubSearchTool(server: McpServer, config?: { exaApiKey?: string }): void {
  server.tool(
    "github_search_exa",
    "Search GitHub repositories and code using Exa AI - finds repositories, code snippets, documentation, and developer profiles on GitHub. Useful for finding open source projects, code examples, and technical resources.",
    {
      query: z.string().describe("GitHub search query (repository name, programming language, username, etc.)"),
      searchType: z.enum(["repositories", "code", "users", "all"]).optional().describe("Type of GitHub content to search (default: all)"),
      numResults: z.number().optional().describe("Number of GitHub results to return (default: 5)")
    },
    async ({ query, searchType, numResults }) => {
      const requestId = `github_search_exa-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'github_search_exa');
      
      logger.start(`${query} (${searchType || 'all'})`);
      
      try {
        // Create a fresh axios instance for each request
        const axiosInstance = axios.create({
          baseURL: API_CONFIG.BASE_URL,
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'x-api-key': config?.exaApiKey || process.env.EXA_API_KEY || ''
          },
          timeout: 25000
        });

        let searchQuery = query;
        if (searchType === "repositories") {
          searchQuery = `${query} GitHub repository`;
        } else if (searchType === "code") {
          searchQuery = `${query} GitHub code`;
        } else if (searchType === "users") {
          searchQuery = `${query} GitHub user profile`;
        } else {
          searchQuery = `${query} GitHub`;
        }

        const searchRequest: ExaSearchRequest = {
          query: searchQuery,
          type: "neural",
          numResults: numResults || API_CONFIG.DEFAULT_NUM_RESULTS,
          contents: {
            text: {
              maxCharacters: API_CONFIG.DEFAULT_MAX_CHARACTERS
            },
            livecrawl: 'preferred'
          },
          includeDomains: ["github.com"]
        };
        
        logger.log("Sending request to Exa API for GitHub search");
        
        const response = await axiosInstance.post<ExaSearchResponse>(
          API_CONFIG.ENDPOINTS.SEARCH,
          searchRequest,
          { timeout: 25000 }
        );
        
        logger.log("Received response from Exa API");

        if (!response.data || !response.data.results) {
          logger.log("Warning: Empty or invalid response from Exa API");
          return {
            content: [{
              type: "text" as const,
              text: "No GitHub content found. Please try a different query."
            }]
          };
        }

        logger.log(`Found ${response.data.results.length} GitHub results`);
        
        const result = {
          content: [{
            type: "text" as const,
            text: JSON.stringify(response.data, null, 2)
          }]
        };
        
        logger.complete();
        return result;
      } catch (error) {
        logger.error(error);
        
        if (axios.isAxiosError(error)) {
          // Handle Axios errors specifically
          const statusCode = error.response?.status || 'unknown';
          const errorMessage = error.response?.data?.message || error.message;
          
          logger.log(`Axios error (${statusCode}): ${errorMessage}`);
          return {
            content: [{
              type: "text" as const,
              text: `GitHub search error (${statusCode}): ${errorMessage}`
            }],
            isError: true,
          };
        }
        
        // Handle generic errors
        return {
          content: [{
            type: "text" as const,
            text: `GitHub search error: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true,
        };
      }
    }
  );
} 