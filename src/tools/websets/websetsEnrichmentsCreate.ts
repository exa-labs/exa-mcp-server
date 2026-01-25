import { z } from "zod";
import axios from "axios";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WEBSETS_API_CONFIG } from "./config.js";
import { WebsetEnrichmentResponseDto, CreateEnrichmentRequest } from "./types.js";
import { createRequestLogger } from "../../utils/logger.js";
import { checkpoint } from "agnost";

export function registerWebsetsEnrichmentsCreateTool(server: McpServer, config?: { exaApiKey?: string }): void {
  server.tool(
    "websets_enrichments_create",
    "Add an enrichment column to a Webset - enrichments automatically search for and extract specific information from each item in the Webset.",
    {
      websetId: z.string().describe("The Webset ID (e.g., 'webset_abc123') or your externalId"),
      description: z.string().describe("What information to extract from each item. Be specific. Example: 'Find the company CEO name and their LinkedIn profile URL'"),
      format: z.enum(['text', 'number', 'date', 'url', 'options']).optional().describe("Expected output format (default: text)"),
      options: z.array(z.object({ label: z.string() })).optional().describe("For 'options' format, the allowed values. Example: [{ label: 'Yes' }, { label: 'No' }]"),
      metadata: z.record(z.unknown()).optional().describe("Custom metadata to attach to the enrichment")
    },
    async ({ websetId, description, format, options, metadata }) => {
      const requestId = `websets_enrichments_create-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'websets_enrichments_create');
      
      logger.start(description);
      
      try {
        const axiosInstance = axios.create({
          baseURL: WEBSETS_API_CONFIG.BASE_URL,
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'x-api-key': config?.exaApiKey || process.env.EXA_API_KEY || '',
            'x-exa-integration': 'websets-mcp'
          },
          timeout: 60000
        });

        const createRequest: CreateEnrichmentRequest = {
          description,
          format,
          options,
          metadata
        };
        
        checkpoint('websets_enrichments_create_request_prepared');
        logger.log(`Creating enrichment for Webset: ${websetId}`);
        
        const response = await axiosInstance.post<WebsetEnrichmentResponseDto>(
          WEBSETS_API_CONFIG.ENDPOINTS.ENRICHMENTS(websetId),
          createRequest,
          { timeout: 60000 }
        );
        
        checkpoint('websets_enrichments_create_response_received');
        logger.log(`Enrichment created: ${response.data.id}`);

        const result = {
          content: [{
            type: "text" as const,
            text: JSON.stringify(response.data, null, 2)
          }]
        };
        
        checkpoint('websets_enrichments_create_complete');
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
              text: `Enrichment creation error (${statusCode}): ${errorMessage}`
            }],
            isError: true,
          };
        }
        
        return {
          content: [{
            type: "text" as const,
            text: `Enrichment creation error: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true,
        };
      }
    }
  );
}
