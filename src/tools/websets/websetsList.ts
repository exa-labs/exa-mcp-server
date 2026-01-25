import { z } from "zod";
import axios from "axios";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WEBSETS_API_CONFIG } from "./config.js";
import { ListWebsetsResponse } from "./types.js";
import { createRequestLogger } from "../../utils/logger.js";
import { checkpoint } from "agnost";

export function registerWebsetsListTool(server: McpServer, config?: { exaApiKey?: string }): void {
  server.tool(
    "websets_list",
    "List all Websets - returns a paginated list of your Websets with their status and metadata.",
    {
      limit: z.number().optional().describe("Maximum number of Websets to return (default: 25)"),
      cursor: z.string().optional().describe("Pagination cursor from previous response"),
      search: z.string().optional().describe("Filter Websets by ID, external ID, or title")
    },
    async ({ limit, cursor, search }) => {
      const requestId = `websets_list-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'websets_list');
      
      logger.start('list');
      
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
        if (search) params.search = search;
        
        checkpoint('websets_list_request_prepared');
        logger.log("Listing Websets");
        
        const response = await axiosInstance.get<ListWebsetsResponse>(
          WEBSETS_API_CONFIG.ENDPOINTS.WEBSETS,
          { params, timeout: 30000 }
        );
        
        checkpoint('websets_list_response_received');
        logger.log(`Found ${response.data.data.length} Websets`);

        const result = {
          content: [{
            type: "text" as const,
            text: JSON.stringify(response.data, null, 2)
          }]
        };
        
        checkpoint('websets_list_complete');
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
              text: `Websets list error (${statusCode}): ${errorMessage}`
            }],
            isError: true,
          };
        }
        
        return {
          content: [{
            type: "text" as const,
            text: `Websets list error: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true,
        };
      }
    }
  );
}
