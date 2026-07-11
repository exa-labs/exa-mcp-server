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
