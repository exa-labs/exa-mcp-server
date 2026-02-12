import { z } from "zod";
import axios from "axios";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const AUTH_API_URL = process.env.AUTH_API_URL || "";
const MCP_AUTH_SECRET = process.env.MCP_AUTH_SECRET || "";
const AUTH_BYPASS_TOKEN = process.env.AUTH_BYPASS_TOKEN || "";

export function registerGetOtpTool(server: McpServer): void {
  server.tool(
    "get_otp",
    "Send a verification code to an email address to sign up for Exa and get free API credits. After calling this, ask the user for the 6-digit code from their email and call validate_otp.",
    {
      email: z.string().describe("The user's email address"),
    },
    async ({ email }) => {
      if (!AUTH_API_URL) {
        return {
          content: [{ type: "text" as const, text: "Authentication service is not configured." }],
          isError: true,
        };
      }

      try {
        const response = await axios.post(
          `${AUTH_API_URL}/api/mcp-auth/request-otp`,
          { email },
          {
            headers: {
              "Content-Type": "application/json",
              "x-mcp-auth-secret": MCP_AUTH_SECRET,
              ...(AUTH_BYPASS_TOKEN && { "x-vercel-protection-bypass": AUTH_BYPASS_TOKEN }),
            },
            timeout: 15000,
          },
        );

        return {
          content: [
            {
              type: "text" as const,
              text: `Verification code sent to ${email}. Ask the user to check their email for a 6-digit code, then call validate_otp with the email and code.`,
            },
          ],
        };
      } catch (error) {
        let errorMessage = "Failed to send verification code.";
        if (axios.isAxiosError(error) && error.response?.data?.error) {
          errorMessage = error.response.data.error;
        }

        return {
          content: [
            {
              type: "text" as const,
              text: errorMessage,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
