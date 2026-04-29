import { describe, it, expect } from "vitest";

import { API_CONFIG, integrationHeaders } from "./config.js";

describe("integrationHeaders", () => {
  it("returns the bare tool name when no exaSource is set", () => {
    expect(integrationHeaders("web-search-mcp")).toEqual({
      "x-exa-integration": "web-search-mcp",
    });
  });

  it("appends exaSource when present", () => {
    expect(integrationHeaders("web-search-mcp", { exaSource: "claude-desktop" })).toEqual({
      "x-exa-integration": "web-search-mcp:claude-desktop",
    });
  });

  it("ignores non-string exaSource values", () => {
    expect(integrationHeaders("crawling-mcp", { exaSource: 42 })).toEqual({
      "x-exa-integration": "crawling-mcp",
    });
  });
});

describe("API_CONFIG", () => {
  it("points at api.exa.ai with the canonical endpoints", () => {
    expect(API_CONFIG.BASE_URL).toBe("https://api.exa.ai");
    expect(API_CONFIG.ENDPOINTS.SEARCH).toBe("/search");
    expect(API_CONFIG.ENDPOINTS.RESEARCH).toBe("/research/v1");
  });
});
