import { ExaError } from "exa-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  emptySearchResponse,
  multiSearchResponse,
  searchFetchContentsResponse,
} from "../../fixtures/exaResponses.js";
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

describe("registerWebSearchFetchTool", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("searches, fetches the top results, and formats content with crawl errors", async () => {
    const { registerWebSearchFetchTool } = await import("../../../src/tools/webSearchFetch.js");
    const server = new FakeMcpServer();
    requestMock.mockResolvedValueOnce(multiSearchResponse).mockResolvedValueOnce(searchFetchContentsResponse);

    registerWebSearchFetchTool(server as any, {
      exaApiKey: "test-key",
      defaultSearchType: "fast",
      exaSource: "test-suite",
      mcpSessionId: "session-123",
    });

    const result = await server.getTool("web_search_fetch_exa").handler({
      query: "AI hiring trends",
      numResults: 3,
      category: "news",
      fetchNumResults: 2,
      maxCharacters: 500,
    });

    expect(exaConstructorMock).toHaveBeenCalledWith("test-key");
    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      "/search",
      "POST",
      {
        query: "AI hiring trends",
        type: "fast",
        numResults: 3,
        category: "news",
        contents: {
          highlights: true,
        },
      },
      undefined,
      {
        "x-exa-integration": "web-search-fetch-mcp:test-suite",
        "x-exa-mcp-session-id": "session-123",
      },
    );
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      "/contents",
      "POST",
      {
        ids: ["https://example.com/one", "https://example.com/two"],
        contents: {
          text: {
            maxCharacters: 500,
          },
        },
      },
      undefined,
      {
        "x-exa-integration": "web-search-fetch-mcp:test-suite",
        "x-exa-mcp-session-id": "session-123",
      },
    );

    expect(result).toMatchObject({
      content: [
        {
          type: "text",
          _meta: {
            searchTime: 0.5,
            crawlTime: 0.31,
          },
        },
      ],
    });

    const text = (result as any).content[0].text;
    expect(text).toContain("# Search Results");
    expect(text).toContain("1. Result One");
    expect(text).toContain("# Crawled Contents");
    expect(text).toContain("## 1. Fetched One");
    expect(text).toContain("Full page one text");
    expect(text).toContain("# Crawl Errors");
    expect(text).toContain("Error crawling https://example.com/two: forbidden (403)");
    expect((result as any).isError).toBeUndefined();
  });

  it("uses defaults and clamps fetchNumResults to the returned result count", async () => {
    const { registerWebSearchFetchTool } = await import("../../../src/tools/webSearchFetch.js");
    const server = new FakeMcpServer();
    requestMock.mockResolvedValueOnce(multiSearchResponse).mockResolvedValueOnce(searchFetchContentsResponse);

    registerWebSearchFetchTool(server as any);

    await server.getTool("web_search_fetch_exa").handler({
      query: "AI hiring trends",
      numResults: -1,
      fetchNumResults: 99,
    });

    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      "/search",
      "POST",
      expect.objectContaining({
        query: "AI hiring trends",
        type: "auto",
        numResults: 10,
      }),
      undefined,
      { "x-exa-integration": "web-search-fetch-mcp" },
    );
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      "/contents",
      "POST",
      {
        ids: ["https://example.com/one", "https://example.com/two", "https://example.com/three"],
        contents: {
          text: {
            maxCharacters: 4000,
          },
        },
      },
      undefined,
      { "x-exa-integration": "web-search-fetch-mcp" },
    );
  });

  it("returns search results only when fetchNumResults is zero", async () => {
    const { registerWebSearchFetchTool } = await import("../../../src/tools/webSearchFetch.js");
    const server = new FakeMcpServer();
    requestMock.mockResolvedValueOnce(multiSearchResponse);

    registerWebSearchFetchTool(server as any);

    const result = await server.getTool("web_search_fetch_exa").handler({
      query: "AI hiring trends",
      fetchNumResults: 0,
    });

    expect(requestMock).toHaveBeenCalledTimes(1);
    expect((result as any).content[0].text).toContain("# Search Results");
    expect((result as any).content[0].text).toContain(
      "Scrape phase bypassed because fetchNumResults was set to 0.",
    );
  });

  it("returns a clear message and skips contents when search has no results", async () => {
    const { registerWebSearchFetchTool } = await import("../../../src/tools/webSearchFetch.js");
    const server = new FakeMcpServer();
    requestMock.mockResolvedValue(emptySearchResponse);

    registerWebSearchFetchTool(server as any);

    await expect(
      server.getTool("web_search_fetch_exa").handler({
        query: "nothing",
      }),
    ).resolves.toEqual({
      content: [{
        type: "text",
        text: "No search results found for query. Scrape phase bypassed.",
      }],
    });
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  it("returns a formatted tool error when a request throws", async () => {
    const { registerWebSearchFetchTool } = await import("../../../src/tools/webSearchFetch.js");
    const server = new FakeMcpServer();
    requestMock.mockRejectedValue(new ExaError("Unauthorized", 401, "2026-04-29T12:00:00.000Z"));

    registerWebSearchFetchTool(server as any, { userProvidedApiKey: true });

    await expect(
      server.getTool("web_search_fetch_exa").handler({
        query: "AI hiring trends",
      }),
    ).resolves.toEqual({
      content: [
        {
          type: "text",
          text: "web_search_fetch_exa error (401): Unauthorized\nTimestamp: 2026-04-29T12:00:00.000Z",
        },
      ],
      isError: true,
    });
  });

  it("returns a formatted tool error when the contents request throws", async () => {
    const { registerWebSearchFetchTool } = await import("../../../src/tools/webSearchFetch.js");
    const server = new FakeMcpServer();
    requestMock
      .mockResolvedValueOnce(multiSearchResponse)
      .mockRejectedValueOnce(new ExaError("contents failed", 400, "2026-04-29T12:00:00.000Z"));

    registerWebSearchFetchTool(server as any, { userProvidedApiKey: true });

    await expect(
      server.getTool("web_search_fetch_exa").handler({
        query: "AI hiring trends",
      }),
    ).resolves.toEqual({
      content: [
        {
          type: "text",
          text: "web_search_fetch_exa error (400): contents failed\nTimestamp: 2026-04-29T12:00:00.000Z",
        },
      ],
      isError: true,
    });
  });
});
