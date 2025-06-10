import { z } from "zod";
import axios from "axios";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG } from "./config.js";
import { createRequestLogger } from "../utils/logger.js";

interface ResearchTaskRequest {
  instructions: string;
  model?: string;
  output?: {
    schema?: any;
    inferSchema?: boolean;
  };
}

interface ResearchTaskResponse {
  id: string;
}

interface ResearchTaskStatusResponse {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

interface ResearchTaskListResponse {
  tasks: Array<{
    id: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    instructions: string;
    created_at: string;
    updated_at: string;
  }>;
  cursor?: string;
}

export function registerResearchTaskTools(server: McpServer): void {
  // Tool to create a research task
  server.tool(
    "exa_research_create_task",
    "Create a research task using Exa AI's research endpoint. This will return a task ID that can be used to check status and retrieve results.",
    {
      instructions: z.string().describe("Research instructions describing what you want to research"),
      model: z.string().optional().describe("Research model to use (default: exa-research)"),
      outputSchema: z.any().optional().describe("JSON schema for structured output format"),
      inferSchema: z.boolean().optional().describe("Allow LLM to generate output schema automatically")
    },
    async ({ instructions, model, outputSchema, inferSchema }) => {
      const requestId = `research_create-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'exa_research_create_task');
      
      logger.start(instructions);
      
      try {
        const axiosInstance = axios.create({
          baseURL: API_CONFIG.BASE_URL,
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'x-api-key': process.env.EXA_API_KEY || ''
          },
          timeout: 30000
        });

        const researchRequest: ResearchTaskRequest = {
          instructions,
          model: model || "exa-research"
        };

        if (outputSchema || inferSchema) {
          researchRequest.output = {};
          if (outputSchema) {
            researchRequest.output.schema = outputSchema;
          }
          if (inferSchema !== undefined) {
            researchRequest.output.inferSchema = inferSchema;
          }
        }
        
        logger.log("Sending research task request to Exa API");
        
        const response = await axiosInstance.post<ResearchTaskResponse>(
          API_CONFIG.ENDPOINTS.RESEARCH_TASKS,
          researchRequest
        );
        
        logger.log(`Research task created with ID: ${response.data.id}`);
        
        const result = {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              taskId: response.data.id,
              status: "Task created successfully. Use exa_research_get_task to check status and retrieve results.",
              instructions: instructions
            }, null, 2)
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
              text: `Research task creation error (${statusCode}): ${errorMessage}`
            }],
            isError: true,
          };
        }
        
        return {
          content: [{
            type: "text" as const,
            text: `Research task creation error: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true,
        };
      }
    }
  );

  // Tool to get research task status and results
  server.tool(
    "exa_research_get_task",
    "Get the status and results of a research task by task ID. Use this to check if a task is complete and retrieve the research results.",
    {
      taskId: z.string().describe("The task ID returned from exa_research_create_task")
    },
    async ({ taskId }) => {
      const requestId = `research_get-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'exa_research_get_task');
      
      logger.start(taskId);
      
      try {
        const axiosInstance = axios.create({
          baseURL: API_CONFIG.BASE_URL,
          headers: {
            'accept': 'application/json',
            'x-api-key': process.env.EXA_API_KEY || ''
          },
          timeout: 30000
        });
        
        logger.log(`Checking status for task ID: ${taskId}`);
        
        const response = await axiosInstance.get<ResearchTaskStatusResponse>(
          `${API_CONFIG.ENDPOINTS.RESEARCH_TASKS}/${taskId}`
        );
        
        logger.log(`Task status: ${response.data.status}`);
        
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
              text: `Research task status error (${statusCode}): ${errorMessage}`
            }],
            isError: true,
          };
        }
        
        return {
          content: [{
            type: "text" as const,
            text: `Research task status error: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true,
        };
      }
    }
  );

  // Tool to list research tasks
  server.tool(
    "exa_research_list_tasks",
    "List your research tasks with pagination support. Returns a list of tasks with their status and metadata.",
    {
      limit: z.number().optional().describe("Number of tasks to return per page (max 200, default: 50)"),
      cursor: z.string().optional().describe("Cursor token for pagination (returned from previous list call)")
    },
    async ({ limit, cursor }) => {
      const requestId = `research_list-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'exa_research_list_tasks');
      
      logger.start(`limit=${limit || 50}, cursor=${cursor || 'none'}`);
      
      try {
        const axiosInstance = axios.create({
          baseURL: API_CONFIG.BASE_URL,
          headers: {
            'accept': 'application/json',
            'x-api-key': process.env.EXA_API_KEY || ''
          },
          timeout: 30000
        });

        // Build query parameters
        const params = new URLSearchParams();
        if (limit !== undefined) {
          params.append('limit', Math.min(limit, 200).toString());
        }
        if (cursor) {
          params.append('cursor', cursor);
        }

        const queryString = params.toString();
        const url = queryString 
          ? `${API_CONFIG.ENDPOINTS.RESEARCH_TASKS}?${queryString}`
          : API_CONFIG.ENDPOINTS.RESEARCH_TASKS;
        
        logger.log("Fetching research tasks list");
        
        const response = await axiosInstance.get<ResearchTaskListResponse>(url);
        
        logger.log(`Retrieved ${response.data.tasks?.length || 0} tasks`);
        
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
              text: `Research tasks list error (${statusCode}): ${errorMessage}`
            }],
            isError: true,
          };
        }
        
        return {
          content: [{
            type: "text" as const,
            text: `Research tasks list error: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true,
        };
      }
    }
  );
}