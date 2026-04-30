import { beforeEach, describe, expect, it, vi } from "vitest";
import { contentsErrorResponse, contentsResponse } from "../../fixtures/exaResponses.js";
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

describe("registerWebFetchTool", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("sends a contents request and formats fetched pages with per-url errors", async () => {
    const { registerWebFetchTool } = await import("../../../src/tools/webFetch.js");
    const server = new FakeMcpServer();
    requestMock.mockResolvedValue(contentsResponse);

    registerWebFetchTool(server as any, { exaApiKey: "test-key" });

    const result = await server.getTool("web_fetch_exa").handler({
      urls: ["https://example.com/page", "https://example.com/missing"],
      maxCharacters: 500,
    });

    expect(exaConstructorMock).toHaveBeenCalledWith("test-key");
    expect(requestMock).toHaveBeenCalledWith(
      "/contents",
      "POST",
      {
        ids: ["https://example.com/page", "https://example.com/missing"],
        contents: {
          text: {
            maxCharacters: 500,
          },
        },
      },
      undefined,
      { "x-exa-integration": "crawling-mcp" },
    );
    expect(result).toMatchObject({
      content: [
        {
          type: "text",
          _meta: { searchTime: 0.24 },
        },
      ],
    });
    expect((result as any).content[0].text).toContain("# Fetched Page");
    expect((result as any).content[0].text).toContain("Full page text");
    expect((result as any).content[0].text).toContain(
      "Error fetching https://example.com/missing: not_found",
    );
  });

  it("returns an MCP error when all URLs fail", async () => {
    const { registerWebFetchTool } = await import("../../../src/tools/webFetch.js");
    const server = new FakeMcpServer();
    requestMock.mockResolvedValue(contentsErrorResponse);

    registerWebFetchTool(server as any);

    await expect(
      server.getTool("web_fetch_exa").handler({
        urls: ["https://example.com/missing"],
      }),
    ).resolves.toEqual({
      content: [
        {
          type: "text",
          text: "Error fetching URL(s): https://example.com/missing: not_found",
        },
      ],
      isError: true,
    });
  });
});
