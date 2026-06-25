import axios from "axios";
import type { ToolContent } from "../types.js";
import { EXA_API_KEYS_URL, TRANSIENT_STATUS_CODES, delay, retryOnTransient } from "./errorHandler.js";

export { delay };

export function isTransientAgentError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  return status != null && TRANSIENT_STATUS_CODES.has(status);
}

export function retryAgentRequest<T>(
  fn: () => Promise<T>,
  opts: { maxRetries?: number; baseDelayMs?: number } = {},
): Promise<T> {
  return retryOnTransient(fn, isTransientAgentError, opts.maxRetries, opts.baseDelayMs);
}

export function formatAgentToolError(
  error: unknown,
  toolName: string,
): ToolContent {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? "unknown";
    const data = error.response?.data;
    const apiMessage = errorMessageFromData(data) ?? error.message;
    const guidance = guidanceForStatus(status);
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

function guidanceForStatus(status: number | "unknown"): string {
  if (status === 400) {
    return "Check the run body and outputSchema. Use a top-level object schema, bound arrays with maxItems when possible, and use input.data for known rows.";
  }
  if (status === 401 || status === 403) {
    return `Authenticate with an Exa API key. API keys are available at ${EXA_API_KEYS_URL}.`;
  }
  if (status === 404) {
    return "Run not found or not visible to this API key. Verify the agent_run_... ID and account.";
  }
  if (status === 429) {
    return "Rate or concurrency limit reached. Wait for active runs to finish, poll existing run IDs, or cancel accidental duplicate runs.";
  }
  return "";
}
