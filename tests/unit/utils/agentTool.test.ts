import { describe, expect, it } from "vitest";
import type { Exa } from "exa-js";
import { createExaClient } from "../../../src/tools/config.js";
import { withAgentTool } from "../../../src/utils/agentTool.js";

function clientHeaders(client: unknown): Headers {
  return (client as { headers: Headers }).headers;
}

describe("Agent Exa client integration", () => {
  it("sets API key auth and integration headers through createExaClient", () => {
    const exa = createExaClient({
      exaApiKey: "exa_test_key",
      exaSource: "claude",
      mcpSessionId: "session-123",
    }, "agent-mcp");
    const headers = clientHeaders(exa);

    expect(headers.get("x-api-key")).toBe("exa_test_key");
    expect(headers.get("x-exa-integration")).toBe("agent-mcp:claude");
    expect(headers.get("x-exa-mcp-session-id")).toBe("session-123");
  });

  it("uses OAuth without falling back to x-api-key", () => {
    const exa = createExaClient({
      oauthAccessToken: "jwt-token",
    }, "agent-mcp");
    const headers = clientHeaders(exa);

    expect(headers.get("x-api-key")).toBeNull();
    expect(headers.get("Authorization")).toBe("Bearer jwt-token");
    expect(headers.get("x-exa-integration")).toBe("agent-mcp");
  });

  it("forwards MCP client metadata through shared header plumbing", () => {
    const exa = createExaClient({
      exaApiKey: "exa_test_key",
      mcpClient: {
        source: "claude-code",
        sessionId: "session-123",
        clientInfo: {
          name: "Claude Code",
          version: "1.0.0",
        },
      },
    }, "agent-mcp");
    const headers = clientHeaders(exa);

    expect(headers.get("x-exa-integration")).toBe("agent-mcp");
    expect(headers.get("x-exa-mcp-client")).toBe(JSON.stringify({
      source: "claude-code",
      sessionId: "session-123",
      clientInfo: {
        name: "Claude Code",
        version: "1.0.0",
      },
    }));
  });

  it("rejects Agent tools without user auth", async () => {
    const handler = withAgentTool(
      "agent_create_run",
      undefined,
      () => "test",
      async () => {
        throw new Error("should not run");
      },
    );

    const result = await handler({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Agent tools require user authentication");
  });

  it("allows Agent tools with a user-provided API key", async () => {
    const handler = withAgentTool(
      "agent_create_run",
      {
        exaApiKey: "user-key",
        exaSource: "claude",
      },
      () => "test",
      async (_args, { client }) => {
        const headers = clientHeaders(client as Exa);
        expect(headers.get("x-api-key")).toBe("user-key");
        expect(headers.get("x-exa-integration")).toBe("agent-mcp:claude");
        return { content: [{ type: "text", text: "ok" }] };
      },
    );

    await expect(handler({})).resolves.toEqual({
      content: [{ type: "text", text: "ok" }],
    });
  });
});
