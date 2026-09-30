import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { emptySearchResponse, searchResponse } from "../../fixtures/exaResponses.js";
import { connectInMemory } from "../../helpers/advertisedTools.js";
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

describe("registerWebSearchTool", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("emits stable checkpoint event names through a provided analytics hook", async () => {
    const { registerWebSearchTool } = await import("../../../src/tools/webSearch.js");
    const server = new FakeMcpServer();
    const checkpoint = vi.fn();
    requestMock.mockResolvedValue(searchResponse);

    registerWebSearchTool(server as any, {
      exaApiKey: "test-key",
      analytics: { checkpoint },
    });

    expect(checkpoint).not.toHaveBeenCalled();

    await server.getTool("web_search_exa").handler({ query: "AI breakthroughs" });

    // Event names are contract: downstream dashboards key on them.
    expect(checkpoint.mock.calls.map(([event]) => event)).toEqual([
      "web_search_request_prepared",
      "exa_search_response_received",
      "web_search_complete",
    ]);
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
          highlights: true,
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

  it("uses an instant default search type when configured", async () => {
    const { registerWebSearchTool } = await import("../../../src/tools/webSearch.js");
    const server = new FakeMcpServer();
    requestMock.mockResolvedValue(searchResponse);

    registerWebSearchTool(server as any, {
      defaultSearchType: "instant",
    });

    await server.getTool("web_search_exa").handler({
      query: "AI breakthroughs",
    });

    expect(requestMock).toHaveBeenCalledWith(
      "/search",
      "POST",
      expect.objectContaining({
        type: "instant",
      }),
      undefined,
      expect.any(Object),
    );
  });

  it("forwards an objective to /search", async () => {
    const { registerWebSearchTool } = await import("../../../src/tools/webSearch.js");
    const server = new FakeMcpServer();
    requestMock.mockResolvedValue(searchResponse);

    registerWebSearchTool(server as any, { exaApiKey: "test-key" });

    await server.getTool("web_search_exa").handler({
      query: "AI breakthroughs",
      objective: "Compile a briefing on recent AI research",
    });

    expect(requestMock).toHaveBeenCalledWith(
      "/search",
      "POST",
      expect.objectContaining({
        query: "AI breakthroughs",
        objective: "Compile a briefing on recent AI research",
      }),
      undefined,
      { "x-exa-integration": "web-search-mcp" },
    );
  });

  it("leaves the objective out of the request when the caller omits it", async () => {
    const { registerWebSearchTool } = await import("../../../src/tools/webSearch.js");
    const server = new FakeMcpServer();
    requestMock.mockResolvedValue(searchResponse);

    registerWebSearchTool(server as any, { exaApiKey: "test-key" });
    await server.getTool("web_search_exa").handler({ query: "AI breakthroughs" });

    expect(requestMock.mock.calls[0][2]).not.toHaveProperty("objective");
  });

  it("validates objectives the way /search does and drops unused ones", async () => {
    const { registerWebSearchTool } = await import("../../../src/tools/webSearch.js");
    const server = new FakeMcpServer();

    registerWebSearchTool(server as any);

    const args = z.object(
      server.getTool("web_search_exa").inputSchema as Record<string, z.ZodTypeAny>,
    );
    expect(args.parse({ query: "q" })).toEqual({ query: "q" });
    expect(args.parse({ query: "q", objective: "  Rank primary sources first  " })).toEqual({
      query: "q",
      objective: "Rank primary sources first",
    });
    expect(args.safeParse({ query: "q", objective: "x".repeat(4096) }).success).toBe(true);
    expect(args.safeParse({ query: "q", objective: "x".repeat(4097) }).success).toBe(false);
    expect(args.safeParse({ query: "q", objective: 42 }).success).toBe(false);
    // Unused optional values some clients send search without an objective.
    for (const unused of [null, "", "  "]) {
      expect(args.parse({ query: "q", objective: unused })).toEqual({ query: "q" });
    }
  });

  it("advertises the objective as required but still searches when a caller omits it", async () => {
    const { registerWebSearchTool } = await import("../../../src/tools/webSearch.js");
    requestMock.mockResolvedValue(searchResponse);
    const client = await connectInMemory((server) =>
      registerWebSearchTool(server, { exaApiKey: "test-key" }),
    );

    try {
      const [tool] = (await client.listTools()).tools;
      expect(tool.inputSchema.required).toEqual(["query", "objective"]);

      for (const args of [{ query: "AI breakthroughs" }, { query: "AI", objective: null }]) {
        const result = await client.callTool({ name: "web_search_exa", arguments: args });
        expect(result.isError).toBeFalsy();
      }
      for (const [, , body] of requestMock.mock.calls) {
        expect(body).not.toHaveProperty("objective");
      }
      expect(requestMock).toHaveBeenCalledTimes(2);
    } finally {
      await client.close();
    }
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
