import { ExaError } from "exa-js";
import type { ToolContent } from "../types.js";
import { EXA_API_KEYS_URL } from "./errorHandler.js";

export const EXA_BILLING_URL = "https://dashboard.exa.ai/billing";

export function formatAgentToolError(error: unknown, toolName: string): ToolContent {
  if (isExaError(error)) {
    const status = error.statusCode;
    const apiMessage = error.message;
    const guidance = guidanceForStatus(status, toolName);
    return {
      content: [
        {
          type: "text",
          text: [`${toolName} error (${status}): ${apiMessage}`, guidance]
            .filter(Boolean)
            .join("\n\n"),
        },
      ],
      isError: true,
    };
  }

  return {
    content: [
      {
        type: "text",
        text: `${toolName} error: ${error instanceof Error ? error.message : String(error)}`,
      },
    ],
    isError: true,
  };
}

function isExaError(error: unknown): error is ExaError {
  return (
    error instanceof ExaError ||
    (error instanceof Error &&
      "statusCode" in error &&
      typeof (error as { statusCode?: unknown }).statusCode === "number")
  );
}

function guidanceForStatus(status: number | "unknown", toolName: string): string {
  if (status === 400) {
    return "Check the run body and outputSchema. Use a top-level object schema, bound arrays with maxItems when possible, and use input.data for known rows.";
  }
  if (status === 402) {
    return `Not retryable: the account is out of credits or over its spending budget, so every ${toolName} call will be rejected until that changes. Do not call ${toolName} again; tell the user to add credits or raise the budget at ${EXA_BILLING_URL}.`;
  }
  if (status === 401 || status === 403) {
    return `Authenticate with an Exa API key. API keys are available at ${EXA_API_KEYS_URL}.`;
  }
  if (status === 404) {
    return "Run not found or not visible to this API key. Verify the agent_run_... ID and account.";
  }
  if (status === 429) {
    return "Rate or concurrency limit reached. Wait for active Agent runs to finish and avoid submitting duplicate runs.";
  }
  return "";
}
