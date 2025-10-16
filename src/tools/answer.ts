import { z } from "zod";
import axios from "axios";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG } from "./config.js";
import { AnswerRequest, AnswerResponse } from "../types.js";
import { createRequestLogger } from "../utils/logger.js";

// JSON Schema validator - validates that the outputSchema is a valid JSON schema
const jsonSchemaValidator = z.object({
  type: z.string().describe("The JSON schema type (e.g., 'object', 'string', 'array')"),
  description: z.string().optional(),
  properties: z.record(z.any()).optional(),
  required: z.array(z.string()).optional(),
  additionalProperties: z.boolean().optional(),
  enum: z.array(z.any()).optional(),
  items: z.any().optional(),
}).passthrough(); // Allow additional JSON schema properties

/**
 * Register the Answer tool for Exa AI
 *
 * This tool provides LLM-powered answers to questions informed by Exa search results.
 * It performs a search, analyzes the results, and generates either:
 * 1. A direct answer for specific queries (e.g., "What is the capital of France?" -> "Paris")
 * 2. A detailed summary with citations for open-ended queries (e.g., "What is the state of AI in healthcare?")
 *
 * The response includes the generated answer, citations (sources), and cost information.
 */
export function registerAnswerTool(server: McpServer, config?: { exaApiKey?: string }): void {
  server.tool(
    "answer_exa",
    "Get an LLM-powered answer to a question informed by Exa search results. Performs a search and uses an LLM to generate either a direct answer for specific queries or a detailed summary with citations for open-ended queries. Returns the answer, sources used, and cost information. Supports optional JSON schema output for structured responses.",
    {
      query: z.string().min(1).describe("The question or query to answer"),
      includeText: z.boolean().optional().describe("If true, include full text content in the citations (default: false). Increases token consumption significantly. Only use when the full text of citations is necessary to put answers into context."),
      outputSchema: jsonSchemaValidator.optional().describe("Optional JSON schema to structure the answer response. Must be a valid JSON schema with at minimum a 'type' property. Example: { type: 'object', properties: { response: { type: 'string', enum: ['yes', 'no', 'maybe'] } }, required: ['response'] }")
    },
    async ({ query, includeText, outputSchema }) => {
      const requestId = `answer_exa-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'answer_exa');

      logger.start(query);

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

        const answerRequest: AnswerRequest = {
          query,
          stream: false,  // MCP tools don't support streaming
          text: includeText || false,
          ...(outputSchema && { outputSchema })
        };

        logger.log("Sending request to Exa Answer API");

        const response = await axiosInstance.post<AnswerResponse>(
          API_CONFIG.ENDPOINTS.ANSWER,
          answerRequest,
          { timeout: 25000 }
        );

        logger.log("Received response from Exa Answer API");

        if (!response.data || !response.data.answer) {
          logger.log("Warning: Empty or invalid response from Exa Answer API");
          return {
            content: [{
              type: "text" as const,
              text: "Failed to generate an answer. Please try rephrasing your query."
            }]
          };
        }

        logger.log(`Answer generated with ${response.data.citations?.length || 0} citations`);

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
              text: `Answer error (${statusCode}): ${errorMessage}`
            }],
            isError: true,
          };
        }

        // Handle generic errors
        return {
          content: [{
            type: "text" as const,
            text: `Answer error: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true,
        };
      }
    }
  );
}
