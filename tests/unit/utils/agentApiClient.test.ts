import { describe, expect, it } from "vitest";
import { buildAgentHeaders } from "../../../src/utils/agentApiClient.js";

describe("buildAgentHeaders", () => {
  it("sets required Agent auth and integration headers", () => {
    const headers = buildAgentHeaders("exa_test_key", {
      exaSource: "claude",
      mcpSessionId: "session-123",
    });

    expect(headers["x-api-key"]).toBe("exa_test_key");
    expect(headers["x-exa-integration"]).toBe("agent-mcp:claude");
    expect(headers["x-exa-mcp-session-id"]).toBe("session-123");
  });

  it("forwards MCP client metadata through shared header plumbing", () => {
    const headers = buildAgentHeaders("exa_test_key", {
      mcpClient: {
        source: "claude-code",
        sessionId: "session-123",
        clientInfo: {
          name: "Claude Code",
          version: "1.0.0",
        },
      },
    });

    expect(headers["x-exa-integration"]).toBe("agent-mcp");
    expect(headers["x-exa-mcp-client"]).toBe(JSON.stringify({
      source: "claude-code",
      sessionId: "session-123",
      clientInfo: {
        name: "Claude Code",
        version: "1.0.0",
      },
    }));
  });
});
