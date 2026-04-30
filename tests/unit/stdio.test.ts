import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { fakeServer, initializeMcpServerMock, mcpServerConstructorMock, stdioTransportConstructorMock, connectMock } = vi.hoisted(() => {
  const fakeServer = { id: "underlying-server" };
  const initializeMcpServerMock = vi.fn();
  const mcpServerConstructorMock = vi.fn();
  const stdioTransportConstructorMock = vi.fn();
  const connectMock = vi.fn().mockResolvedValue(undefined);

  return {
    fakeServer,
    initializeMcpServerMock,
    mcpServerConstructorMock,
    stdioTransportConstructorMock,
    connectMock,
  };
});

vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => ({
  McpServer: class {
    readonly server = fakeServer;
    readonly connect = connectMock;

    constructor(...args: unknown[]) {
      mcpServerConstructorMock(...args);
    }
  },
}));

vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
  StdioServerTransport: class {
    constructor(...args: unknown[]) {
      stdioTransportConstructorMock(...args);
    }
  },
}));

vi.mock("../../src/mcp-handler.js", () => ({
  initializeMcpServer: initializeMcpServerMock,
}));

describe("Stdio entrypoint", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("buildConfigFromEnv treats EXA_API_KEY as user-provided", async () => {
    const { buildConfigFromEnv } = await import("../../src/stdio.js");

    const config = buildConfigFromEnv({
      EXA_API_KEY: "env-key",
      ENABLED_TOOLS: "web_search_exa, web_fetch_exa",
      DEBUG: "false",
    });

    expect(config).toEqual({
      exaApiKey: "env-key",
      enabledTools: ["web_search_exa", "web_fetch_exa"],
      debug: false,
      defaultSearchType: undefined,
      userProvidedApiKey: true,
    });
  });

  it("buildConfigFromEnv leaves userProvidedApiKey false when EXA_API_KEY is missing", async () => {
    const { buildConfigFromEnv } = await import("../../src/stdio.js");

    const config = buildConfigFromEnv({
      TOOLS: "web_search_exa",
      DEBUG: "true",
      DEFAULT_SEARCH_TYPE: "fast",
    });

    expect(config).toEqual({
      exaApiKey: undefined,
      enabledTools: ["web_search_exa"],
      debug: true,
      defaultSearchType: "fast",
      userProvidedApiKey: false,
    });
  });

  it("main() wires the McpServer through stdio transport with env-derived config", async () => {
    const { main } = await import("../../src/stdio.js");

    await main({
      EXA_API_KEY: "env-key",
      ENABLED_TOOLS: "web_search_exa",
      DEBUG: "false",
    });

    expect(mcpServerConstructorMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: "exa-search-server", title: "Exa" }),
    );
    expect(initializeMcpServerMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        exaApiKey: "env-key",
        enabledTools: ["web_search_exa"],
        userProvidedApiKey: true,
      }),
    );
    expect(stdioTransportConstructorMock).toHaveBeenCalledTimes(1);
    expect(connectMock).toHaveBeenCalledTimes(1);
  });
});
