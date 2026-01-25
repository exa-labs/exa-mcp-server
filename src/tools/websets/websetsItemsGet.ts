import { z } from "zod";
import axios from "axios";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WEBSETS_API_CONFIG } from "./config.js";
import { WebsetItemDto } from "./types.js";
import { createRequestLogger } from "../../utils/logger.js";
import { checkpoint } from "agnost";

export function registerWebsetsItemsGetTool(server: McpServer, config?: { exaApiKey?: string }): void {
  server.tool(
    "websets_items_get",
    "Get a specific item from a Webset - retrieves full details including properties, evaluations, and enrichment results.",
    {
      websetId: z.string().describe("The Webset ID (e.g., 'webset_abc123') or your externalId"),
      itemId: z.string().describe("The Item ID (e.g., 'witem_abc123')")
    },
    async ({ websetId, itemId }) => {
      const requestId = `websets_items_get-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'websets_items_get');
      
      logger.start(itemId);
      
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
        
        checkpoint('websets_items_get_request_prepared');
        logger.log(`Fetching item: ${itemId}`);
        
        const response = await axiosInstance.get<WebsetItemDto>(
          WEBSETS_API_CONFIG.ENDPOINTS.ITEM(websetId, itemId),
          { timeout: 30000 }
        );
        
        checkpoint('websets_items_get_response_received');
        logger.log(`Item retrieved: ${response.data.id}`);

        const result = {
          content: [{
            type: "text" as const,
            text: JSON.stringify(response.data, null, 2)
          }]
        };
        
        checkpoint('websets_items_get_complete');
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
                text: `Item not found: ${itemId} in Webset: ${websetId}`
              }],
              isError: true,
            };
          }
          
          logger.log(`Axios error (${statusCode}): ${errorMessage}`);
          return {
            content: [{
              type: "text" as const,
              text: `Item fetch error (${statusCode}): ${errorMessage}`
            }],
            isError: true,
          };
        }
        
        return {
          content: [{
            type: "text" as const,
            text: `Item fetch error: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true,
        };
      }
    }
  );
}
