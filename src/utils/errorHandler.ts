/**
 * Error handling utilities for Exa MCP server.
 * Provides rate limit detection and user-friendly error messages for free MCP users.
 */
import axios from "axios";

const FREE_MCP_RATE_LIMIT_MESSAGE = `You've hit Exa's free MCP rate limit. To continue using without limits, create your own Exa API key.

Fix: Create API key at https://dashboard.exa.ai/api-keys , and then update Exa MCP URL to this https://mcp.exa.ai/mcp?exaApiKey=YOUR_EXA_API_KEY`;

/**
 * Checks if an Axios error is a rate limit error (HTTP 429) and if the user is using the free MCP.
 * Returns a user-friendly error message if both conditions are met.
 * 
 * @param error - The error to check
 * @param userProvidedApiKey - Whether the user provided their own API key via URL parameter
 * @param toolName - The name of the tool that encountered the error (for logging)
 */
export function handleRateLimitError(
  error: unknown,
  userProvidedApiKey: boolean | undefined,
  toolName: string
): { content: Array<{ type: "text"; text: string }>; isError: true } | null {
  if (!axios.isAxiosError(error)) {
    return null;
  }

  const statusCode = error.response?.status;
  const isRateLimited = statusCode === 429;
  const isUsingFreeMcp = !userProvidedApiKey;

  if (isRateLimited && isUsingFreeMcp) {
    return {
      content: [
        {
          type: "text" as const,
          text: FREE_MCP_RATE_LIMIT_MESSAGE,
        },
      ],
      isError: true,
    };
  }

  return null;
}
