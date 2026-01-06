import { z } from "zod";
import axios from "axios";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG } from "./config.js";
import { createRequestLogger } from "../utils/logger.js";
import { checkpoint } from "agnost";

interface AnswerResponse {
  requestId: string;
  answer: string;
  citations?: Array<{
    id: string;
    url: string;
    title: string;
    snippet?: string;
    publishedDate?: string;
  }>;
}

export function registerAnswerTool(server: McpServer, config?: { exaApiKey?: string }): void {
  server.tool(
    "answer_exa",
    "Get a direct answer to a question with citations from the web - Exa searches the web and synthesizes an answer with source citations. Ideal for factual questions, research queries, or when you need verified information with sources.",
    {
      query: z.string().describe("Question or query to answer"),
      numResults: z.number().optional().describe("Number of sources to use for answering (1-20, default: 5)"),
      includeDomains: z.array(z.string()).optional().describe("Only use sources from these domains"),
      excludeDomains: z.array(z.string()).optional().describe("Exclude sources from these domains"),
      startPublishedDate: z.string().optional().describe("Only use sources published after this date (ISO 8601: YYYY-MM-DD)"),
      endPublishedDate: z.string().optional().describe("Only use sources published before this date (ISO 8601: YYYY-MM-DD)"),
      category: z.enum(['company', 'research paper', 'news', 'pdf', 'github', 'tweet', 'personal site', 'people', 'financial report']).optional().describe("Filter sources to a specific category"),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true
    },
    async (params) => {
      const requestId = `answer_exa-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'answer_exa');

      logger.start(params.query);

      try {
        const axiosInstance = axios.create({
          baseURL: API_CONFIG.BASE_URL,
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'x-api-key': config?.exaApiKey || process.env.EXA_API_KEY || '',
            'x-exa-integration': 'answer-mcp'
          },
          timeout: 60000 // Longer timeout for answer generation
        });

        const answerRequest: Record<string, unknown> = {
          query: params.query,
          numResults: params.numResults || 5,
        };

        if (params.includeDomains && params.includeDomains.length > 0) {
          answerRequest.includeDomains = params.includeDomains;
        }

        if (params.excludeDomains && params.excludeDomains.length > 0) {
          answerRequest.excludeDomains = params.excludeDomains;
        }

        if (params.startPublishedDate) {
          answerRequest.startPublishedDate = params.startPublishedDate;
        }

        if (params.endPublishedDate) {
          answerRequest.endPublishedDate = params.endPublishedDate;
        }

        if (params.category) {
          answerRequest.category = params.category;
        }

        checkpoint('answer_request_prepared');
        logger.log("Sending answer request to Exa API");

        const response = await axiosInstance.post<AnswerResponse>(
          API_CONFIG.ENDPOINTS.ANSWER,
          answerRequest,
          { timeout: 60000 }
        );

        checkpoint('answer_response_received');
        logger.log("Received response from Exa API");

        if (!response.data || !response.data.answer) {
          logger.log("Warning: No answer in response from Exa API");
          checkpoint('answer_complete');
          return {
            content: [{
              type: "text" as const,
              text: "Unable to generate an answer for this query. Please try rephrasing your question."
            }]
          };
        }

        // Format response with answer and citations
        let resultText = `## Answer\n\n${response.data.answer}\n`;

        if (response.data.citations && response.data.citations.length > 0) {
          resultText += `\n## Sources\n\n`;
          response.data.citations.forEach((citation, index) => {
            resultText += `${index + 1}. [${citation.title}](${citation.url})`;
            if (citation.publishedDate) {
              resultText += ` (${citation.publishedDate})`;
            }
            resultText += '\n';
            if (citation.snippet) {
              resultText += `   > ${citation.snippet}\n`;
            }
          });
        }

        logger.log(`Response prepared with ${resultText.length} characters`);

        const result = {
          content: [{
            type: "text" as const,
            text: resultText
          }]
        };

        checkpoint('answer_complete');
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
              text: `Answer error (${statusCode}): ${errorMessage}`
            }],
            isError: true,
          };
        }

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
