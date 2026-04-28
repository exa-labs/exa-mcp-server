/**
 * Error handling utilities for Exa MCP server.
 * Provides retry logic, enriched error messages, and rate limit detection.
 */
import { ExaError } from "exa-js";

type ToolErrorResult = { content: Array<{ type: "text"; text: string }>; isError: true };

const TRANSIENT_STATUS_CODES = new Set([500, 502, 503, 504]);

const FREE_MCP_RATE_LIMIT_MESSAGE = `You've hit Exa's free MCP rate limit. To continue using without limits, create your own Exa API key.

Fix: Create API key at https://dashboard.exa.ai/api-keys , and then update Exa MCP URL to this https://mcp.exa.ai/mcp?exaApiKey=YOUR_EXA_API_KEY`;

/**
 * Checks if an error is a rate limit error (HTTP 429) and if the user is using the free MCP.
 * Returns a user-friendly error message if both conditions are met.
 */
export function handleRateLimitError(
  error: unknown,
  userProvidedApiKey: boolean | undefined,
  toolName: string
): ToolErrorResult | null {
  if (!(error instanceof ExaError)) {
    return null;
  }

  const isRateLimited = error.statusCode === 429;
  const isUsingFreeMcp = !userProvidedApiKey;

  if (isRateLimited && isUsingFreeMcp) {
    return {
      content: [{ type: "text" as const, text: FREE_MCP_RATE_LIMIT_MESSAGE }],
      isError: true,
    };
  }

  return null;
}

/**
 * Retries an async function on transient (5xx) errors with exponential backoff.
 * Delays: 1s after first failure, 2s after second failure.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!(error instanceof ExaError) || !TRANSIENT_STATUS_CODES.has(error.statusCode) || attempt === maxRetries) {
        throw error;
      }
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }
  throw lastError;
}

/**
 * Formats any error into a structured MCP tool error response.
 * Handles rate limits, ExaError (with retry guidance + timestamp), and generic errors.
 */
export function formatToolError(
  error: unknown,
  toolName: string,
  userProvidedApiKey?: boolean
): ToolErrorResult {
  const rateLimitResult = handleRateLimitError(error, userProvidedApiKey, toolName);
  if (rateLimitResult) return rateLimitResult;

  if (error instanceof ExaError) {
    const statusCode = error.statusCode || 'unknown';
    const lines = [
      `${toolName} error (${statusCode}): ${error.message}`,
      ...(error.timestamp ? [`Timestamp: ${error.timestamp}`] : []),
    ];
    return { content: [{ type: "text" as const, text: lines.join('\n') }], isError: true };
  }

  return {
    content: [{ type: "text" as const, text: `${toolName} error: ${error instanceof Error ? error.message : String(error)}` }],
    isError: true,
  };
}
