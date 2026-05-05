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
});
