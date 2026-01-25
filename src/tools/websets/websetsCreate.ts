import { z } from "zod";
import axios from "axios";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WEBSETS_API_CONFIG } from "./config.js";
import { WebsetDto, WebsetCreateRequest } from "./types.js";
import { createRequestLogger } from "../../utils/logger.js";
import { checkpoint } from "agnost";

export function registerWebsetsCreateTool(server: McpServer, config?: { exaApiKey?: string }): void {
  server.tool(
    "websets_create",
    "Create a new Webset - a curated collection of web entities (companies, people, articles) that match your search criteria. Websets automatically search, evaluate, and optionally enrich results with additional data.",
    {
      query: z.string().describe("Natural language search query describing what you're looking for. Be specific about requirements, characteristics, and constraints. Example: 'AI startups in Europe that raised Series A funding in 2024'"),
      count: z.number().optional().describe("Number of items to find (default: 10). Actual results may be less depending on search complexity."),
      entity: z.enum(['company', 'person', 'article', 'research_paper', 'custom']).optional().describe("Entity type to search for. Auto-detected if not provided."),
      title: z.string().optional().describe("Optional name for the Webset. Auto-generated if not provided."),
      enrichments: z.array(z.object({
        description: z.string().describe("What information to extract from each item. Example: 'Find the CEO name and email'"),
        format: z.enum(['text', 'number', 'date', 'url', 'options']).optional().describe("Expected output format (default: text)"),
        options: z.array(z.object({ label: z.string() })).optional().describe("For 'options' format, the allowed values")
      })).optional().describe("Enrichments to automatically extract additional data from found items"),
      externalId: z.string().optional().describe("Your own identifier to reference this Webset"),
      metadata: z.record(z.unknown()).optional().describe("Custom metadata to attach to the Webset")
    },
    async ({ query, count, entity, title, enrichments, externalId, metadata }) => {
      const requestId = `websets_create-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'websets_create');
      
      logger.start(query);
      
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

        const createRequest: WebsetCreateRequest = {
          title,
          search: {
            query,
            count: count || WEBSETS_API_CONFIG.DEFAULT_SEARCH_COUNT,
            entity
          },
          enrichments,
          externalId,
          metadata
        };
        
        checkpoint('websets_create_request_prepared');
        logger.log("Creating Webset via Exa API");
        
        const response = await axiosInstance.post<WebsetDto>(
          WEBSETS_API_CONFIG.ENDPOINTS.WEBSETS,
          createRequest,
          { timeout: 60000 }
        );
        
        checkpoint('websets_create_response_received');
        logger.log(`Webset created with ID: ${response.data.id}`);

        const result = {
          content: [{
            type: "text" as const,
            text: JSON.stringify(response.data, null, 2)
          }]
        };
        
        checkpoint('websets_create_complete');
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
              text: `Webset creation error (${statusCode}): ${errorMessage}`
            }],
            isError: true,
          };
        }
        
        return {
          content: [{
            type: "text" as const,
            text: `Webset creation error: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true,
        };
      }
    }
  );
}
