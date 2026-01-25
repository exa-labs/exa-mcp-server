import { z } from "zod";
import axios from "axios";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WEBSETS_API_CONFIG } from "./config.js";
import { WebsetDto } from "./types.js";
import { createRequestLogger } from "../../utils/logger.js";
import { checkpoint } from "agnost";

export function registerWebsetsDeleteTool(server: McpServer, config?: { exaApiKey?: string }): void {
  server.tool(
    "websets_delete",
    "Delete a Webset - permanently removes a Webset and all its items. This action cannot be undone.",
    {
      id: z.string().describe("The Webset ID (e.g., 'webset_abc123') or your externalId")
    },
    async ({ id }) => {
      const requestId = `websets_delete-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'websets_delete');
      
      logger.start(id);
      
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
        
        checkpoint('websets_delete_request_prepared');
        logger.log(`Deleting Webset: ${id}`);
        
        const response = await axiosInstance.delete<WebsetDto>(
          WEBSETS_API_CONFIG.ENDPOINTS.WEBSET(id),
          { timeout: 30000 }
        );
        
        checkpoint('websets_delete_response_received');
        logger.log(`Webset deleted: ${response.data.id}`);

        const result = {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ deleted: true, webset: response.data }, null, 2)
          }]
        };
        
        checkpoint('websets_delete_complete');
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
                text: `Webset not found: ${id}`
              }],
              isError: true,
            };
          }
          
          logger.log(`Axios error (${statusCode}): ${errorMessage}`);
          return {
            content: [{
              type: "text" as const,
              text: `Webset delete error (${statusCode}): ${errorMessage}`
            }],
            isError: true,
          };
        }
        
        return {
          content: [{
            type: "text" as const,
            text: `Webset delete error: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true,
        };
      }
    }
  );
}
