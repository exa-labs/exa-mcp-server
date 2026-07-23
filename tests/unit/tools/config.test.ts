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

  it("applies embedder requestHeaders last so they can override defaults", () => {
    expect(
      integrationHeaders("web-search-mcp", {
        exaSource: "claude",
        requestHeaders: {
          "x-exa-integration": "overridden",
          "x-exa-source": "wrapper",
          "x-custom": "yes",
        },
      }),
    ).toEqual({
      "x-exa-integration": "overridden",
      "x-exa-source": "wrapper",
      "x-custom": "yes",
    });
  });

  it("lets requestHeaders override built-in OAuth and session headers", () => {
    expect(
      integrationHeaders("web-search-mcp", {
        oauthAccessToken: "jwt-token",
        mcpSessionId: "session-123",
        requestHeaders: {
          Authorization: "Bearer wrapper-token",
          "x-exa-mcp-session-id": "wrapper-session",
        },
      }),
    ).toEqual({
      "x-exa-integration": "web-search-mcp",
      Authorization: "Bearer wrapper-token",
      "x-exa-mcp-session-id": "wrapper-session",
    });
  });

  it("ignores non-string requestHeaders values", () => {
    expect(
      integrationHeaders("web-search-mcp", {
        requestHeaders: { good: "yes", bad: 42 } as unknown as Record<string, string>,
      }),
    ).toEqual({
      "x-exa-integration": "web-search-mcp",
      good: "yes",
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

  it("encodes non-ASCII client-controlled header values", () => {
    const headers = integrationHeaders("web-search-mcp", {
      exaSource: "你hao",
      mcpClient: {
        clientInfo: { name: "你🚀" },
        userAgent: "agent/é",
      },
    });

    expect(headers["x-exa-integration"]).toBe("web-search-mcp:%E4%BD%A0hao");
    expect(headers["x-exa-mcp-client"]).toBe(
      '{"clientInfo":{"name":"\\u4f60\\ud83d\\ude80"},"userAgent":"agent/\\u00e9"}',
    );
    expect(() => new Headers(headers)).not.toThrow();
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

  it("applies embedder requestHeaders to clients created with a tool name", () => {
    const exa = createExaClient({
      exaApiKey: "exa_test_key",
      requestHeaders: { "x-exa-source": "wrapper" },
    }, "agent-mcp");
    const headers = clientHeaders(exa);

    expect(headers.get("x-api-key")).toBe("exa_test_key");
    expect(headers.get("x-exa-source")).toBe("wrapper");
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
