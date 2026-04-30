import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptySearchResponse, searchResponse } from "../../fixtures/exaResponses.js";
import { FakeMcpServer } from "../../helpers/fakeMcpServer.js";

const { ExaMock, exaConstructorMock, requestMock } = vi.hoisted(() => {
  const requestMock = vi.fn();
  const exaConstructorMock = vi.fn();
  class ExaMock {
    request = requestMock;

    constructor(...args: unknown[]) {
      exaConstructorMock(...args);
    }
  }

  return {
    ExaMock,
    exaConstructorMock,
    requestMock,
  };
});

vi.mock("exa-js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("exa-js")>()),
  Exa: ExaMock,
}));

vi.mock("agnost", () => ({
  checkpoint: vi.fn(),
}));

describe("registerWebSearchTool", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("sends a sanitized search request and formats highlighted results", async () => {
    const { registerWebSearchTool } = await import("../../../src/tools/webSearch.js");
    const server = new FakeMcpServer();
    requestMock.mockResolvedValue(searchResponse);

    registerWebSearchTool(server as any, {
      exaApiKey: "test-key",
      defaultSearchType: "fast",
      mcpSessionId: "session-123",
    });

    const result = await server.getTool("web_search_exa").handler({
      query: "category:news AI breakthroughs",
      numResults: 2,
    });

    expect(exaConstructorMock).toHaveBeenCalledWith("test-key");
    expect(requestMock).toHaveBeenCalledWith(
      "/search",
      "POST",
      {
        query: "AI breakthroughs",
        type: "fast",
        numResults: 2,
        category: "news",
        contents: {
          highlights: { query: "AI breakthroughs", maxCharacters: 2000 },
        },
      },
      undefined,
      { "x-exa-integration": "web-search-mcp", "x-exa-mcp-session-id": "session-123" },
    );
    expect(result).toMatchObject({
      content: [
        {
          type: "text",
          _meta: { searchTime: 0.42 },
        },
      ],
    });
    expect((result as any).content[0].text).toContain("Title: Result One");
    expect((result as any).content[0].text).toContain("First highlight");
  });

  it("returns a friendly message when Exa has no results", async () => {
    const { registerWebSearchTool } = await import("../../../src/tools/webSearch.js");
    const server = new FakeMcpServer();
    requestMock.mockResolvedValue(emptySearchResponse);

    registerWebSearchTool(server as any);

    await expect(
      server.getTool("web_search_exa").handler({
        query: "nothing",
      }),
    ).resolves.toEqual({
      content: [{ type: "text", text: "No search results found. Please try a different query." }],
    });
  });
});
