import { beforeEach, describe, expect, it, vi } from "vitest";

const { fakeServer, initializeMcpServerMock, mcpServerConstructorMock } = vi.hoisted(() => {
  const fakeServer = { id: "underlying-server" };
  const initializeMcpServerMock = vi.fn();
  const mcpServerConstructorMock = vi.fn();

  return {
    fakeServer,
    initializeMcpServerMock,
    mcpServerConstructorMock,
  };
});

vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => ({
  McpServer: class {
    readonly server = fakeServer;

    constructor(...args: unknown[]) {
      mcpServerConstructorMock(...args);
    }
  },
}));

vi.mock("../../src/mcp-handler.js", () => ({
  initializeMcpServer: initializeMcpServerMock,
}));

describe("Smithery entrypoint", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("passes Smithery exaApiKey config as a user-provided API key", async () => {
    const { default: createServer } = await import("../../src/index.js");

    const result = createServer({
      config: {
        exaApiKey: "smithery-key",
        enabledTools: "web_search_exa, web_fetch_exa",
        debug: false,
      },
    });

    expect(result).toBe(fakeServer);
    expect(initializeMcpServerMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        exaApiKey: "smithery-key",
        enabledTools: ["web_search_exa", "web_fetch_exa"],
        userProvidedApiKey: true,
      }),
    );
  });

  it("does not mark missing Smithery exaApiKey config as user-provided", async () => {
    const { default: createServer } = await import("../../src/index.js");

    createServer({
      config: {
        tools: ["web_search_exa"],
        debug: false,
      },
    });

    expect(initializeMcpServerMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        exaApiKey: undefined,
        enabledTools: ["web_search_exa"],
        userProvidedApiKey: false,
      }),
    );
  });
});
