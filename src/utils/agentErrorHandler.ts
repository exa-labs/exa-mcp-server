import { ExaError } from "exa-js";
import type { ToolContent } from "../types.js";
import { EXA_API_KEYS_URL, TRANSIENT_STATUS_CODES, delay, retryOnTransient } from "./errorHandler.js";

export { delay };

export function isTransientAgentError(error: unknown): boolean {
  if (!isExaError(error)) return false;
  return TRANSIENT_STATUS_CODES.has(error.statusCode);
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
  if (isExaError(error)) {
    const status = error.statusCode;
    const apiMessage = error.message;
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

function isExaError(error: unknown): error is ExaError {
  return error instanceof ExaError || (
    error instanceof Error &&
    "statusCode" in error &&
    typeof (error as { statusCode?: unknown }).statusCode === "number"
  );
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
