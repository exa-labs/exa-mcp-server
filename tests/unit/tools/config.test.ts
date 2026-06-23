import { describe, expect, it } from "vitest";
import { integrationHeaders, createExaClient } from "../../../src/tools/config.js";

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

  it("includes Authorization Bearer header when oauthAccessToken is present", () => {
    expect(
      integrationHeaders("web-search-mcp", {
        oauthAccessToken: "eyJhbGciOiJSUzI1NiJ9.payload.signature",
      }),
    ).toEqual({
      "x-exa-integration": "web-search-mcp",
      Authorization: "Bearer eyJhbGciOiJSUzI1NiJ9.payload.signature",
    });
  });

  it("does not include Authorization header when oauthAccessToken is absent", () => {
    expect(
      integrationHeaders("web-search-mcp", { exaSource: "cursor" }),
    ).toEqual({
      "x-exa-integration": "web-search-mcp:cursor",
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
  it("strips x-api-key header for OAuth users", () => {
    const exa = createExaClient({ oauthAccessToken: "jwt-token" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const headers: Headers = (exa as any).headers;
    expect(headers.has("x-api-key")).toBe(false);
    expect(headers.has("Content-Type")).toBe(true);
  });

  it("sets x-api-key header for non-OAuth users", () => {
    const exa = createExaClient({ exaApiKey: "test-key-123" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const headers: Headers = (exa as any).headers;
    expect(headers.get("x-api-key")).toBe("test-key-123");
  });

  it("falls back to EXA_API_KEY env var when no exaApiKey in config", () => {
    const original = process.env.EXA_API_KEY;
    process.env.EXA_API_KEY = "env-key-456";
    try {
      const exa = createExaClient({});
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const headers: Headers = (exa as any).headers;
      expect(headers.get("x-api-key")).toBe("env-key-456");
    } finally {
      process.env.EXA_API_KEY = original;
    }
  });
});
