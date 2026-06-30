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

describe("registerWebSearchAdvancedTool", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("defaults to highlights only and omits text when no content mode is requested", async () => {
    const { registerWebSearchAdvancedTool } = await import(
      "../../../src/tools/webSearchAdvanced.js"
    );
    const server = new FakeMcpServer();
    requestMock.mockResolvedValue(searchResponse);

    registerWebSearchAdvancedTool(server as any, { exaApiKey: "test-key" });

    await server.getTool("web_search_advanced_exa").handler({
      query: "AI breakthroughs",
    });

    expect(requestMock).toHaveBeenCalledTimes(1);
    const sentBody = requestMock.mock.calls[0][2];
    expect(sentBody.contents).toEqual({
      livecrawl: "fallback",
      highlights: true,
    });
  });

  it("opts into text via enableText without falling back to default highlights", async () => {
    const { registerWebSearchAdvancedTool } = await import(
      "../../../src/tools/webSearchAdvanced.js"
    );
    const server = new FakeMcpServer();
    requestMock.mockResolvedValue(searchResponse);

    registerWebSearchAdvancedTool(server as any, { exaApiKey: "test-key" });

    await server.getTool("web_search_advanced_exa").handler({
      query: "AI breakthroughs",
      enableText: true,
    });

    const sentBody = requestMock.mock.calls[0][2];
    expect(sentBody.contents).toEqual({
      livecrawl: "fallback",
      text: true,
    });
  });
});
