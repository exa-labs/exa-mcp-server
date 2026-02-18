import { z } from "zod";
import axios from "axios";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createSessionToken } from "../utils/session.js";

const AUTH_API_URL = process.env.AUTH_API_URL || "";
const MCP_AUTH_SECRET = process.env.MCP_AUTH_SECRET || "";
const AUTH_BYPASS_TOKEN = process.env.AUTH_BYPASS_TOKEN || "";

export function registerValidateOtpTool(server: McpServer): void {
  server.tool(
    "validate_otp",
    "Verify a 6-digit code and get authenticated access with free credits. Returns a session_token — pass it to all subsequent Exa tool calls for unlimited access.",
    {
      email: z.string().describe("The email address the code was sent to"),
      otp: z.string().describe("The 6-digit verification code from the user's email"),
    },
    async ({ email, otp }) => {
      if (!AUTH_API_URL) {
        return {
          content: [{ type: "text" as const, text: "Authentication service is not configured." }],
          isError: true,
        };
      }

      try {
        const response = await axios.post(
          `${AUTH_API_URL}/api/mcp-auth/verify-otp`,
          { email, otp },
          {
            headers: {
              "Content-Type": "application/json",
              "x-mcp-auth-secret": MCP_AUTH_SECRET,
              ...(AUTH_BYPASS_TOKEN && { "x-vercel-protection-bypass": AUTH_BYPASS_TOKEN }),
            },
            timeout: 15000,
          },
        );

        const { apiKey, isNewUser } = response.data;
        const sessionToken = await createSessionToken(apiKey);

        const welcomeMessage = isNewUser
          ? "Account created successfully! You now have free Exa API credits."
          : "Signed in successfully!";

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                session_token: sessionToken,
                message: `${welcomeMessage} Pass session_token to all subsequent Exa tool calls for authenticated access.`,
              }),
            },
          ],
        };
      } catch (error) {
        let errorMessage = "Failed to verify code.";
        if (axios.isAxiosError(error) && error.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error instanceof Error && !axios.isAxiosError(error)) {
          errorMessage = `Verification succeeded but session creation failed: ${error.message}`;
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
