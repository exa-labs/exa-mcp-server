import { z } from "zod";
import axios from "axios";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG } from "./config.js";
import { createRequestLogger } from "../utils/logger.js";

export function registerCrawlingTool(server: McpServer, config?: { exaApiKey?: string }): void {
  server.tool(
    "crawling_exa",
    "Extract and crawl content from specific URLs using Exa AI - retrieves full text content, metadata, and structured information from web pages. Ideal for extracting detailed content from known URLs.",
    {
      url: z.string().describe("URL to crawl and extract content from"),
      maxCharacters: z.number().optional().describe("Maximum characters to extract (default: 3000)")
    },
    async ({ url, maxCharacters }) => {
      const requestId = `crawling_exa-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'crawling_exa');
      
      logger.start(url);
      
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

        const crawlRequest = {
          ids: [url],
          contents: {
            text: {
              maxCharacters: maxCharacters || API_CONFIG.DEFAULT_MAX_CHARACTERS
            },
            livecrawl: 'preferred'
          }
        };
        
        logger.log("Sending crawl request to Exa API");
        
        const response = await axiosInstance.post(
          '/contents',
          crawlRequest,
          { timeout: 25000 }
        );
        
        logger.log("Received response from Exa API");

        if (!response.data || !response.data.contents) {
          logger.log("Warning: Empty or invalid response from Exa API");
          return {
            content: [{
              type: "text" as const,
              text: "No content found for the provided URL."
            }]
          };
        }

        logger.log(`Successfully crawled content from URL`);
        
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
              text: `Crawling error (${statusCode}): ${errorMessage}`
            }],
            isError: true,
          };
        }
        
        // Handle generic errors
        return {
          content: [{
            type: "text" as const,
            text: `Crawling error: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true,
        };
      }
    }
  );
} 