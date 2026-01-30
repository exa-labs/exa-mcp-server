/**
 * Error handling utilities for Exa MCP server.
 * Provides rate limit detection and user-friendly error messages for free MCP users.
 */
import axios from "axios";

const FREE_MCP_RATE_LIMIT_MESSAGE = `You are using the free MCP which has rate limits. To use without the rate limits, you should create your own API key here: dashboard.exa.ai/api-keys, and then use the API key in the MCP URL like this: "https://mcp.exa.ai/mcp?exaApiKey=YOUREXAAPIKEY"`;

/**
 * Checks if an Axios error is a rate limit error (HTTP 429) and if the user is using the free MCP.
 * Returns a user-friendly error message if both conditions are met.
 */
export function handleRateLimitError(
  error: unknown,
  exaApiKey: string | undefined,
  toolName: string
): { content: Array<{ type: "text"; text: string }>; isError: true } | null {
  if (!axios.isAxiosError(error)) {
    return null;
  }

  const statusCode = error.response?.status;
  const isRateLimited = statusCode === 429;
  const isUsingFreeMcp = !exaApiKey && !process.env.EXA_API_KEY;

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
