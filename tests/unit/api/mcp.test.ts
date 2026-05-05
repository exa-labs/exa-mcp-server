import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  capturedRequests,
  createMcpHandlerMock,
  initializeMcpServerMock,
  isJwtTokenMock,
  verifyOAuthTokenMock,
} = vi.hoisted(() => {
  const capturedRequests: Request[] = [];
  const initializeMcpServerMock = vi.fn();
  const createMcpHandlerMock = vi.fn((initializeServer: (server: unknown) => void) => {
    return async (request: Request) => {
      capturedRequests.push(request);
      initializeServer({ server: "fake-server" });
      return new Response("ok");
    };
  });
  const isJwtTokenMock = vi.fn((token: string) => token === "jwt-token" || token === "invalid-jwt");
  const verifyOAuthTokenMock = vi.fn();

  return {
    capturedRequests,
    createMcpHandlerMock,
    initializeMcpServerMock,
    isJwtTokenMock,
    verifyOAuthTokenMock,
  };
});

vi.mock("mcp-handler", () => ({
  createMcpHandler: createMcpHandlerMock,
}));

vi.mock("../../../src/mcp-handler.js", () => ({
  initializeMcpServer: initializeMcpServerMock,
}));

vi.mock("../../../src/utils/auth.js", () => ({
  isJwtToken: isJwtTokenMock,
  verifyOAuthToken: verifyOAuthTokenMock,
}));

async function callHandleRequest(request: Request, options?: { forceOAuth?: boolean }) {
  const { handleRequest } = await import("../../../api/mcp.js");
  const response = await handleRequest(request, options);
  const config = initializeMcpServerMock.mock.calls.at(-1)?.[1];
  const forwardedRequest = capturedRequests.at(-1);

  return { response, config, forwardedRequest };
}

describe("api/mcp API key configuration", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    capturedRequests.length = 0;
    isJwtTokenMock.mockImplementation((token: string) => token === "jwt-token" || token === "invalid-jwt");
    verifyOAuthTokenMock.mockResolvedValue(null);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    delete process.env.DEBUG;
    delete process.env.ENABLED_TOOLS;
    delete process.env.EXA_API_KEY;
    delete process.env.EXA_API_KEY_BYPASS;
    delete process.env.OAUTH_USER_AGENTS;
    delete process.env.RATE_LIMIT_BYPASS;
  });

  it("falls back to EXA_API_KEY without marking it as user-provided", async () => {
    process.env.EXA_API_KEY = "env-key";

    const { config } = await callHandleRequest(new Request("https://mcp.exa.ai/mcp"));

    expect(config).toMatchObject({
      exaApiKey: "env-key",
      userProvidedApiKey: false,
      authMethod: "free_tier",
    });
  });

  it("uses x-api-key as the highest-priority user-provided API key", async () => {
    const { config, forwardedRequest } = await callHandleRequest(
      new Request("https://mcp.exa.ai/mcp?exaApiKey=query-key", {
        headers: {
          authorization: "Bearer bearer-key",
          "x-api-key": "header-key",
        },
      }),
    );

    expect(config).toMatchObject({
      exaApiKey: "header-key",
      userProvidedApiKey: true,
      authMethod: "api_key",
    });
    expect(isJwtTokenMock).not.toHaveBeenCalled();
    expect(forwardedRequest?.headers.get("x-api-key")).toBeNull();
    expect(forwardedRequest?.headers.get("authorization")).toBeNull();
    expect(new URL(forwardedRequest?.url ?? "").searchParams.has("exaApiKey")).toBe(false);
  });

  it("passes the MCP session id through request config and sanitized MCP request", async () => {
    const { config, forwardedRequest } = await callHandleRequest(
      new Request("https://mcp.exa.ai/mcp", {
        headers: {
          "MCP-Session-Id": "session-123",
        },
      }),
    );

    expect(config).toMatchObject({
      mcpSessionId: "session-123",
    });
    expect(forwardedRequest?.headers.get("MCP-Session-Id")).toBe("session-123");
  });

  it("assigns a stateless MCP session id on initialize responses", async () => {
    const { response } = await callHandleRequest(
      new Request("https://mcp.exa.ai/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {},
        }),
      }),
    );

    expect(response.headers.get("Mcp-Session-Id")).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("does not assign an MCP session id on non-initialize responses", async () => {
    const { response } = await callHandleRequest(
      new Request("https://mcp.exa.ai/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
          params: {},
        }),
      }),
    );

    expect(response.headers.get("Mcp-Session-Id")).toBeNull();
  });

  it("uses a plain Authorization bearer token before query parameters", async () => {
    const { config, forwardedRequest } = await callHandleRequest(
      new Request("https://mcp.exa.ai/mcp?exaApiKey=query-key", {
        headers: {
          authorization: "Bearer bearer-key",
        },
      }),
    );

    expect(config).toMatchObject({
      exaApiKey: "bearer-key",
      userProvidedApiKey: true,
      authMethod: "api_key",
    });
    expect(isJwtTokenMock).toHaveBeenCalledWith("bearer-key");
    expect(forwardedRequest?.headers.get("authorization")).toBeNull();
    expect(new URL(forwardedRequest?.url ?? "").searchParams.has("exaApiKey")).toBe(false);
  });

  it("uses an OAuth JWT api key claim from Authorization bearer tokens", async () => {
    verifyOAuthTokenMock.mockResolvedValue({
      sub: "user-1",
      "exa:team_id": "team-1",
      "exa:api_key_id": "oauth-api-key",
      scope: "mcp:tools",
    });

    const { config } = await callHandleRequest(
      new Request("https://mcp.exa.ai/mcp", {
        headers: {
          authorization: "Bearer jwt-token",
        },
      }),
    );

    expect(verifyOAuthTokenMock).toHaveBeenCalledWith("jwt-token");
    expect(config).toMatchObject({
      exaApiKey: "oauth-api-key",
      userProvidedApiKey: true,
      authMethod: "oauth",
    });
  });

  it("does not treat invalid OAuth JWTs as plain API keys", async () => {
    process.env.EXA_API_KEY = "env-key";
    verifyOAuthTokenMock.mockResolvedValue(null);

    const { config } = await callHandleRequest(
      new Request("https://mcp.exa.ai/mcp", {
        headers: {
          authorization: "Bearer invalid-jwt",
        },
      }),
    );

    expect(verifyOAuthTokenMock).toHaveBeenCalledWith("invalid-jwt");
    expect(config).toMatchObject({
      exaApiKey: "env-key",
      userProvidedApiKey: false,
      authMethod: "free_tier",
    });
  });

  it("uses exaApiKey query parameters when no key header is present", async () => {
    const { config, forwardedRequest } = await callHandleRequest(
      new Request("https://mcp.exa.ai/mcp?exaApiKey=query-key"),
    );

    expect(config).toMatchObject({
      exaApiKey: "query-key",
      userProvidedApiKey: true,
      authMethod: "api_key",
    });
    expect(new URL(forwardedRequest?.url ?? "").searchParams.has("exaApiKey")).toBe(false);
  });

  it("requires auth before initializing MCP when OAuth is forced", async () => {
    const { response } = await callHandleRequest(new Request("https://mcp.exa.ai/mcp/oauth"), {
      forceOAuth: true,
    });

    expect(response.status).toBe(401);
    expect(createMcpHandlerMock).not.toHaveBeenCalled();
    expect(initializeMcpServerMock).not.toHaveBeenCalled();
  });

  it("uses the internal bypass API key without treating it as user-provided", async () => {
    process.env.RATE_LIMIT_BYPASS = "BypassClient";
    process.env.EXA_API_KEY_BYPASS = "bypass-key";

    const { config } = await callHandleRequest(
      new Request("https://mcp.exa.ai/mcp", {
        headers: {
          "user-agent": "BypassClient/1.0",
        },
      }),
    );

    expect(config).toMatchObject({
      exaApiKey: "bypass-key",
      userProvidedApiKey: false,
      authMethod: "free_tier",
    });
  });

  it("does not swap to the bypass API key when the user provides their own key", async () => {
    process.env.RATE_LIMIT_BYPASS = "BypassClient";
    process.env.EXA_API_KEY_BYPASS = "bypass-key";

    const { config } = await callHandleRequest(
      new Request("https://mcp.exa.ai/mcp", {
        headers: {
          "user-agent": "BypassClient/1.0",
          "x-api-key": "user-key",
        },
      }),
    );

    expect(config).toMatchObject({
      exaApiKey: "user-key",
      userProvidedApiKey: true,
      authMethod: "api_key",
    });
  });
});
