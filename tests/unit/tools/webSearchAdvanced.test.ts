import { beforeEach, describe, expect, it, vi } from "vitest";
import { searchResponse } from "../../fixtures/exaResponses.js";
import { FakeMcpServer } from "../../helpers/fakeMcpServer.js";

const { ExaMock, requestMock } = vi.hoisted(() => {
  const requestMock = vi.fn();
  class ExaMock {
    request = requestMock;
  }

  return { ExaMock, requestMock };
});

vi.mock("exa-js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("exa-js")>()),
  Exa: ExaMock,
}));

vi.mock("agnost", () => ({
  checkpoint: vi.fn(),
}));

async function registerAdvancedTool(config: { dynamicHighlights?: boolean } = {}) {
  const { registerWebSearchAdvancedTool } = await import("../../../src/tools/webSearchAdvanced.js");
  const server = new FakeMcpServer();
  registerWebSearchAdvancedTool(server as any, { exaApiKey: "test-key", ...config });
  return server.getTool("web_search_advanced_exa");
}

describe("web_search_advanced_exa dynamic highlights", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("requests dynamic highlights with the Exa-Beta header when the server has them on", async () => {
    const tool = await registerAdvancedTool({ dynamicHighlights: true });
    requestMock.mockResolvedValue(searchResponse);

    await tool.handler({
      query: "AI breakthroughs",
      enableHighlights: true,
      highlightsQuery: "benchmarks",
    });

    const [, , request, , headers] = requestMock.mock.calls[0];
    expect(request.contents.highlights).toEqual({ query: "benchmarks", dynamic: true });
    expect(headers).toEqual({
      "x-exa-integration": "web-search-advanced-mcp",
      "Exa-Beta": "dynamic-highlights-2026-08-28",
    });
  });

  it("sends no highlights when the server has dynamic highlights on but the call does not enable them", async () => {
    const tool = await registerAdvancedTool({ dynamicHighlights: true });
    requestMock.mockResolvedValue(searchResponse);

    await tool.handler({ query: "AI breakthroughs" });

    const [, , request, , headers] = requestMock.mock.calls[0];
    expect(request.contents.highlights).toBeUndefined();
    expect(headers).not.toHaveProperty("Exa-Beta");
  });

  it("refuses highlightsMaxCharacters without calling the API when the server has dynamic highlights on", async () => {
    const tool = await registerAdvancedTool({ dynamicHighlights: true });

    const result = await tool.handler({
      query: "AI breakthroughs",
      enableHighlights: true,
      highlightsMaxCharacters: 800,
    });

    expect(requestMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: "web_search_advanced_exa error: this server uses dynamic highlights (beta), which share one budget across all results, so highlightsMaxCharacters is not supported. Remove it.",
        },
      ],
      isError: true,
    });
  });

  it("allows dynamic highlights on a lite search", async () => {
    const tool = await registerAdvancedTool({ dynamicHighlights: true });
    requestMock.mockResolvedValue(searchResponse);

    const result = await tool.handler({
      query: "AI breakthroughs",
      type: "lite",
      enableHighlights: true,
    });

    expect((result as any).isError).toBeUndefined();
    const [, , request, , headers] = requestMock.mock.calls[0];
    expect(request.contents.highlights).toEqual({ dynamic: true });
    expect(headers).toHaveProperty("Exa-Beta", "dynamic-highlights-2026-08-28");
  });

  it.each([{}, { dynamicHighlights: false }])(
    "keeps per-URL highlights and sends no Exa-Beta header with server config %o",
    async (config) => {
      const tool = await registerAdvancedTool(config);
      requestMock.mockResolvedValue(searchResponse);

      await tool.handler({
        query: "AI breakthroughs",
        enableHighlights: true,
        highlightsMaxCharacters: 500,
      });

      const [, , request, , headers] = requestMock.mock.calls[0];
      expect(request.contents.highlights).toEqual({ maxCharacters: 500 });
      expect(headers).not.toHaveProperty("Exa-Beta");
    },
  );
});
