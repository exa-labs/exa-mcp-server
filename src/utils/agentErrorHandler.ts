import axios from "axios";
import type { ToolContent } from "../types.js";

const TRANSIENT_STATUS_CODES = new Set([500, 502, 503, 504]);

export function isTransientAgentError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  return status != null && TRANSIENT_STATUS_CODES.has(status);
}

export async function retryAgentRequest<T>(
  fn: () => Promise<T>,
  opts: { maxRetries?: number; baseDelayMs?: number } = {},
): Promise<T> {
  const maxRetries = opts.maxRetries ?? 2;
  const baseDelayMs = opts.baseDelayMs ?? 1000;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isTransientAgentError(error) || attempt === maxRetries) {
        throw error;
      }
      await delay(baseDelayMs * 2 ** attempt);
    }
  }

  throw lastError;
}

export function formatAgentToolError(
  error: unknown,
  toolName: string,
  userProvidedApiKey?: boolean,
): ToolContent {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? "unknown";
    const data = error.response?.data;
    const apiMessage = errorMessageFromData(data) ?? error.message;
    const guidance = guidanceForStatus(status, userProvidedApiKey);
    return {
      content: [{
        type: "text",
        text: [`${toolName} error (${status}): ${apiMessage}`, guidance].filter(Boolean).join("\n\n"),
      }],
      isError: true,
    };
  }

  return {
    content: [{
      type: "text",
      text: `${toolName} error: ${error instanceof Error ? error.message : String(error)}`,
    }],
    isError: true,
  };
}

function errorMessageFromData(data: unknown): string | undefined {
  if (data == null || typeof data !== "object") return undefined;
  const record = data as Record<string, unknown>;
  const message = record.message;
  if (typeof message === "string") return message;
  const error = record.error;
  if (typeof error === "string") return error;
  return JSON.stringify(data);
}

function guidanceForStatus(status: number | "unknown", userProvidedApiKey?: boolean): string {
  if (status === 400) {
    return "Check the run body and outputSchema. Use a top-level object schema, bound arrays with maxItems when possible, and use input.data for known rows.";
  }
  if (status === 401 || status === 403) {
    return "Authenticate with an Exa API key. API keys are available at https://dashboard.exa.ai/api-keys.";
  }
  if (status === 404) {
    return "Run not found or not visible to this API key. Verify the agent_run_... ID and account.";
  }
  if (status === 429 && !userProvidedApiKey) {
    return "You've hit Exa's free MCP rate limit. Use an Exa API key to continue without anonymous limits.";
  }
  if (status === 429) {
    return "Rate or concurrency limit reached. Wait for active runs to finish, poll existing run IDs, or cancel accidental duplicate runs.";
  }
  return "";
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
