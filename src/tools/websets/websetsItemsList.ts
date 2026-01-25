import { z } from "zod";
import axios from "axios";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WEBSETS_API_CONFIG } from "./config.js";
import { ListWebsetItemsResponse } from "./types.js";
import { createRequestLogger } from "../../utils/logger.js";
import { checkpoint } from "agnost";

export function registerWebsetsItemsListTool(server: McpServer, config?: { exaApiKey?: string }): void {
  server.tool(
    "websets_items_list",
    "List items in a Webset - returns the found entities with their properties, evaluations, and enrichment results.",
    {
      websetId: z.string().describe("The Webset ID (e.g., 'webset_abc123') or your externalId"),
      limit: z.number().optional().describe("Maximum number of items to return (default: 25)"),
      cursor: z.string().optional().describe("Pagination cursor from previous response"),
      sourceId: z.string().optional().describe("Filter items by source (search or import) ID")
    },
    async ({ websetId, limit, cursor, sourceId }) => {
      const requestId = `websets_items_list-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'websets_items_list');
      
      logger.start(websetId);
      
      try {
        const axiosInstance = axios.create({
          baseURL: WEBSETS_API_CONFIG.BASE_URL,
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'x-api-key': config?.exaApiKey || process.env.EXA_API_KEY || '',
            'x-exa-integration': 'websets-mcp'
          },
          timeout: 30000
        });

        const params: Record<string, string | number> = {};
        if (limit) params.limit = limit;
        if (cursor) params.cursor = cursor;
        if (sourceId) params.sourceId = sourceId;
        
        checkpoint('websets_items_list_request_prepared');
        logger.log(`Listing items for Webset: ${websetId}`);
        
        const response = await axiosInstance.get<ListWebsetItemsResponse>(
          WEBSETS_API_CONFIG.ENDPOINTS.ITEMS(websetId),
          { params, timeout: 30000 }
        );
        
        checkpoint('websets_items_list_response_received');
        logger.log(`Found ${response.data.data.length} items`);

        const result = {
          content: [{
            type: "text" as const,
            text: JSON.stringify(response.data, null, 2)
          }]
        };
        
        checkpoint('websets_items_list_complete');
        logger.complete();
        return result;
      } catch (error) {
        logger.error(error);
        
        if (axios.isAxiosError(error)) {
          const statusCode = error.response?.status || 'unknown';
          const errorMessage = error.response?.data?.message || error.message;
          
          if (statusCode === 404) {
            return {
              content: [{
                type: "text" as const,
                text: `Webset not found: ${websetId}`
              }],
              isError: true,
            };
          }
          
          logger.log(`Axios error (${statusCode}): ${errorMessage}`);
          return {
            content: [{
              type: "text" as const,
              text: `Items list error (${statusCode}): ${errorMessage}`
            }],
            isError: true,
          };
        }
        
        return {
          content: [{
            type: "text" as const,
            text: `Items list error: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true,
        };
      }
    }
  );
}
