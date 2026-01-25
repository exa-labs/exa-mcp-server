import { z } from "zod";
import axios from "axios";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WEBSETS_API_CONFIG } from "./config.js";
import { WebsetEnrichmentResponseDto } from "./types.js";
import { createRequestLogger } from "../../utils/logger.js";
import { checkpoint } from "agnost";

export function registerWebsetsEnrichmentsGetTool(server: McpServer, config?: { exaApiKey?: string }): void {
  server.tool(
    "websets_enrichments_get",
    "Get an enrichment by ID - retrieves the status and configuration of an enrichment column.",
    {
      websetId: z.string().describe("The Webset ID (e.g., 'webset_abc123') or your externalId"),
      enrichmentId: z.string().describe("The Enrichment ID (e.g., 'wenrich_abc123')")
    },
    async ({ websetId, enrichmentId }) => {
      const requestId = `websets_enrichments_get-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'websets_enrichments_get');
      
      logger.start(enrichmentId);
      
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
        
        checkpoint('websets_enrichments_get_request_prepared');
        logger.log(`Fetching enrichment: ${enrichmentId}`);
        
        const response = await axiosInstance.get<WebsetEnrichmentResponseDto>(
          WEBSETS_API_CONFIG.ENDPOINTS.ENRICHMENT(websetId, enrichmentId),
          { timeout: 30000 }
        );
        
        checkpoint('websets_enrichments_get_response_received');
        logger.log(`Enrichment retrieved: ${response.data.id}`);

        const result = {
          content: [{
            type: "text" as const,
            text: JSON.stringify(response.data, null, 2)
          }]
        };
        
        checkpoint('websets_enrichments_get_complete');
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
                text: `Enrichment not found: ${enrichmentId} in Webset: ${websetId}`
              }],
              isError: true,
            };
          }
          
          logger.log(`Axios error (${statusCode}): ${errorMessage}`);
          return {
            content: [{
              type: "text" as const,
              text: `Enrichment fetch error (${statusCode}): ${errorMessage}`
            }],
            isError: true,
          };
        }
        
        return {
          content: [{
            type: "text" as const,
            text: `Enrichment fetch error: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true,
        };
      }
    }
  );
}
