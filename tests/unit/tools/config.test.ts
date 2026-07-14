import { describe, expect, it } from "vitest";
import { createExaClient, integrationHeaders } from "../../../src/tools/config.js";

function clientHeaders(client: unknown): Headers {
  return (client as { headers: Headers }).headers;
}

describe("integrationHeaders", () => {
  it("includes the Exa integration header", () => {
    expect(integrationHeaders("web-search-mcp")).toEqual({
      "x-exa-integration": "web-search-mcp",
    });
  });

  it("appends source and forwards MCP session id as an Exa reporting header when present", () => {
    expect(
      integrationHeaders("web-search-mcp", {
        exaSource: "claude",
        mcpSessionId: "session-123",
      }),
    ).toEqual({
      "x-exa-integration": "web-search-mcp:claude",
      "x-exa-mcp-session-id": "session-123",
    });
  });

  it("includes Authorization bearer header when OAuth access token is present", () => {
    expect(
      integrationHeaders("web-search-mcp", {
        oauthAccessToken: "jwt-token",
      }),
    ).toEqual({
      "x-exa-integration": "web-search-mcp",
      Authorization: "Bearer jwt-token",
    });
  });

  it("forwards MCP client metadata as one structured header", () => {
    expect(
      integrationHeaders("web-search-mcp", {
        mcpClient: {
          source: "claude-code",
          sessionId: "session-123",
          clientInfo: {
            name: "Claude Code",
            version: "1.0.0",
          },
          userAgent: "Claude-Code-UA/1.0",
        },
      }),
    ).toEqual({
      "x-exa-integration": "web-search-mcp",
      "x-exa-mcp-client": JSON.stringify({
        source: "claude-code",
        sessionId: "session-123",
        clientInfo: {
          name: "Claude Code",
          version: "1.0.0",
        },
        userAgent: "Claude-Code-UA/1.0",
      }),
    });
  });

  it("omits oversized MCP client metadata", () => {
    expect(
      integrationHeaders("web-search-mcp", {
        mcpClient: {
          userAgent: "a".repeat(2049),
        },
      }),
    ).toEqual({
      "x-exa-integration": "web-search-mcp",
    });
  });
});

describe("createExaClient", () => {
  it("sets API key auth and Agent integration headers", () => {
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
    const exa = createExaClient({ oauthAccessToken: "jwt-token" }, "agent-mcp");
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
        clientInfo: { name: "Claude Code", version: "1.0.0" },
      },
    }, "agent-mcp");
    const headers = clientHeaders(exa);

    expect(headers.get("x-exa-integration")).toBe("agent-mcp");
    expect(headers.get("x-exa-mcp-client")).toBe(JSON.stringify({
      source: "claude-code",
      sessionId: "session-123",
      clientInfo: { name: "Claude Code", version: "1.0.0" },
    }));
  });
});
