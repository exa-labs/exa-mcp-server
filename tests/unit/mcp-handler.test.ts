import { beforeEach, describe, expect, it, vi } from "vitest";
import { initializeMcpServer } from "../../src/mcp-handler.js";
import { FakeMcpServer } from "../helpers/fakeMcpServer.js";

vi.mock("agnost", () => ({
  checkpoint: vi.fn(),
  createConfig: vi.fn((config: unknown) => config),
  trackMCP: vi.fn(),
}));

describe("initializeMcpServer", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("registers the default public tools, help prompt, and tools resource", async () => {
    const server = new FakeMcpServer();

    initializeMcpServer(server);

    expect(server.tools.map((tool) => tool.name)).toEqual(["web_search_exa", "web_fetch_exa"]);
    expect(server.prompts.map((prompt) => prompt.name)).toEqual(["web_search_help"]);
    expect(server.resources.map((resource) => resource.name)).toEqual(["tools_list"]);

    const resourceResult = await server.resources[0].handler();
    expect(resourceResult).toMatchObject({
      contents: [
        {
          uri: "exa://tools/list",
          mimeType: "application/json",
        },
      ],
    });

    const toolsList = JSON.parse((resourceResult as any).contents[0].text);
    expect(toolsList).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "web_search_exa", enabled: true }),
        expect.objectContaining({ id: "web_fetch_exa", enabled: true }),
        expect.objectContaining({ id: "web_search_advanced_exa", enabled: false }),
      ]),
    );
  });

  it("respects explicit tool selection and deprecated aliases", () => {
    const server = new FakeMcpServer();

    initializeMcpServer(server, {
      enabledTools: ["web_search_advanced_exa", "crawling_exa", "deep_search_exa"],
      userProvidedApiKey: false,
    });

    expect(server.tools.map((tool) => tool.name)).toEqual(["web_search_advanced_exa", "crawling_exa"]);
  });

  it("only registers deep_search_exa when the user provided an API key", () => {
    const server = new FakeMcpServer();

    initializeMcpServer(server, {
      enabledTools: ["deep_search_exa"],
      userProvidedApiKey: true,
    });

    expect(server.tools.map((tool) => tool.name)).toEqual(["deep_search_exa"]);
  });
});
