import { describe, expect, it } from "vitest";
import { integrationHeaders } from "../../../src/tools/config.js";

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
