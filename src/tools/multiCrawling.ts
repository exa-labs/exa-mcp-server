import { z } from "zod";
import axios from "axios";
import { toolRegistry, API_CONFIG } from "./config.js";
import { ExaCrawlRequest } from "../types.js";
import { createRequestLogger } from "../utils/logger.js";

toolRegistry["multi_crawling"] = {
  name: "multi_crawling",
  description: "Extract content from multiple specific URLs using Exa AI. Performs targeted crawling of web pages to retrieve their full content. Returns the complete text content for each specified URL.",
  schema: {
    urls: z.array(z.string()).describe("An array of URLs to crawl (e.g., ['exa.ai', 'google.com'])")
  },
  handler: async ({ urls }, extra) => {
    const requestId = `multi_crawling-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, 'multi_crawling');
    
    logger.start(JSON.stringify(urls));
    
    try {
      const axiosInstance = axios.create({
        baseURL: API_CONFIG.BASE_URL,
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'x-api-key': process.env.EXA_API_KEY || ''
        },
        timeout: 25000
      });

      const crawlRequest: ExaCrawlRequest = {
        ids: urls,
        text: true,
        livecrawl: 'always'
      };
      
      logger.log(`Crawling URLs: ${urls.join(', ')}`);
      logger.log("Sending crawling request to Exa API for multiple URLs");
      
      const response = await axiosInstance.post(
        '/contents', 
        crawlRequest,
        { timeout: 45000 }
      );
      
      logger.log("Received crawling response from Exa API");

      if (!response.data || !response.data.results || response.data.results.length === 0) {
        logger.log("Warning: Empty or invalid response from Exa API for multi-crawling");
        return {
          content: [{
            type: "text" as const,
            text: "No content found for the specified URLs. Please check the URLs and try again."
          }]
        };
      }

      logger.log(`Successfully crawled content from ${response.data.results.length} URLs`);
      
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
        const statusCode = error.response?.status || 'unknown';
        const errorMessage = error.response?.data?.message || error.message;
        
        logger.log(`Axios error (${statusCode}): ${errorMessage}`);
        return {
          content: [{
            type: "text" as const,
            text: `Multi-crawling error (${statusCode}): ${errorMessage}`
          }],
          isError: true,
        };
      }
      
      return {
        content: [{
          type: "text" as const,
          text: `Multi-crawling error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true,
      };
    }
  },
  enabled: false 
};