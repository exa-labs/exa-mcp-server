import axios, { type AxiosInstance } from "axios";
import { API_CONFIG, integrationHeaders } from "../tools/config.js";
import type { AgentRun, AgentRunInput } from "../types.js";
import { retryAgentRequest } from "./agentErrorHandler.js";

export type AgentApiClientConfig = {
  exaApiKey?: string;
  exaSource?: string;
  mcpSessionId?: string;
  mcpClient?: unknown;
};

export class AgentApiClient {
  private readonly client: AxiosInstance;

  constructor(private readonly config: AgentApiClientConfig = {}) {
    const apiKey = config.exaApiKey ?? process.env.EXA_API_KEY;
    if (apiKey == null || apiKey.length === 0) {
      throw new Error("EXA_API_KEY is required. Provide an Exa API key.");
    }

    this.client = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: 30000,
      headers: buildAgentHeaders(apiKey, config),
    });
  }

  async createRun(input: AgentRunInput): Promise<AgentRun> {
    const response = await this.client.post<AgentRun>(API_CONFIG.ENDPOINTS.RUNS, input);
    return response.data;
  }

  async getRun(runId: string): Promise<AgentRun> {
    const response = await retryAgentRequest(() =>
      this.client.get<AgentRun>(API_CONFIG.ENDPOINTS.RUN_BY_ID(runId)),
    );
    return response.data;
  }

  async cancelRun(runId: string): Promise<AgentRun> {
    const response = await retryAgentRequest(() =>
      this.client.post<AgentRun>(API_CONFIG.ENDPOINTS.RUN_CANCEL(runId)),
    );
    return response.data;
  }
}

export function buildAgentHeaders(apiKey: string, config: AgentApiClientConfig = {}): Record<string, string> {
  return {
    accept: "application/json",
    "content-type": "application/json",
    "x-api-key": apiKey,
    ...integrationHeaders("agent-mcp", config),
  };
}
