import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExaError } from "exa-js";
import { initializeMcpServer, type McpConfig } from "../../src/mcp-handler.js";
import { searchResponse } from "../fixtures/exaResponses.js";
import { FakeMcpServer } from "../helpers/fakeMcpServer.js";

const { ExaMock, exaConstructorMock, requestMock } = vi.hoisted(() => {
  const requestMock = vi.fn();
  const exaConstructorMock = vi.fn();
  class ExaMock {
    headers = new Headers();
    request = requestMock;

    constructor(...args: unknown[]) {
      exaConstructorMock(...args);
    }
  }
  return { ExaMock, exaConstructorMock, requestMock };
});

vi.mock("exa-js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("exa-js")>()),
  Exa: ExaMock,
}));

describe("initializeMcpServer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
        expect.objectContaining({ id: "agent_run", enabled: false }),
      ]),
    );
  });

  it("registers agent_run by default when the user provided an API key", async () => {
    const server = new FakeMcpServer();

    initializeMcpServer(server, { userProvidedApiKey: true });

    expect(server.tools.map((tool) => tool.name)).toEqual([
      "web_search_exa",
      "web_fetch_exa",
      "agent_run",
    ]);
    expect(server.prompts.map((prompt) => prompt.name)).toEqual([
      "web_search_help",
      "agent_research_help",
    ]);
    expect(server.resources.map((resource) => resource.name)).toEqual([
      "tools_list",
      "agent_research_guide",
      "agent_schema_templates",
    ]);

    const resourceResult = await server.resources[0].handler();
    const toolsList = JSON.parse((resourceResult as any).contents[0].text);
    expect(toolsList).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "web_search_exa", enabled: true }),
        expect.objectContaining({ id: "web_fetch_exa", enabled: true }),
        expect.objectContaining({ id: "agent_run", enabled: true }),
        expect.objectContaining({ id: "web_search_advanced_exa", enabled: false }),
      ]),
    );
  });

  it("does not register agent_run by default for free-tier callers", () => {
    const server = new FakeMcpServer();

    initializeMcpServer(server, { userProvidedApiKey: false });

    expect(server.tools.map((tool) => tool.name)).toEqual(["web_search_exa", "web_fetch_exa"]);
    expect(server.prompts.map((prompt) => prompt.name)).toEqual(["web_search_help"]);
  });

  it("names only the registered search and fetch tools in the agent_run description", () => {
    const withSearchOnly = new FakeMcpServer();
    initializeMcpServer(withSearchOnly, {
      enabledTools: ["web_search_exa", "agent_run"],
      userProvidedApiKey: true,
    });
    const description = withSearchOnly.getTool("agent_run").description;
    expect(description).toContain("(use web_search_exa)");
    expect(description).not.toContain("web_fetch_exa");

    const agentOnly = new FakeMcpServer();
    initializeMcpServer(agentOnly, { enabledTools: ["agent_run"], userProvidedApiKey: true });
    expect(agentOnly.getTool("agent_run").description).not.toMatch(/web_(search|fetch)/);
  });

  it("retries a tool call on the fallback credential after an upstream API-key rejection", async () => {
    const server = new FakeMcpServer();
    const config: McpConfig = {
      exaApiKey: "revoked-url-key",
      userProvidedApiKey: true,
      apiKeyFallback: vi.fn(async () => {
        config.exaApiKey = undefined;
        config.oauthAccessToken = "jwt-token";
        return true;
      }),
    };
    requestMock
      .mockRejectedValueOnce(new ExaError("x-api-key header is invalid", 401))
      .mockResolvedValueOnce(searchResponse);

    initializeMcpServer(server, config);
    const result = await server.getTool("web_search_exa").handler({ query: "exa" });

    expect(result).not.toMatchObject({ isError: true });
    expect(config.apiKeyFallback).toHaveBeenCalledTimes(1);
    expect(exaConstructorMock.mock.calls.map(([apiKey]) => apiKey)).toEqual([
      "revoked-url-key",
      "oauth",
    ]);
    expect(requestMock).toHaveBeenCalledTimes(2);
    expect(requestMock.mock.calls[1][4]).toMatchObject({ Authorization: "Bearer jwt-token" });
  });

  it("keeps the analytics wrapServer hook on the underlying server when a fallback is set", () => {
    const wrapServer = vi.fn();
    const server = new FakeMcpServer();

    initializeMcpServer(server, {
      analytics: { wrapServer },
      apiKeyFallback: async () => false,
    });

    expect(wrapServer).toHaveBeenCalledWith(server.server);
    expect(server.tools.map((tool) => tool.name)).toEqual(["web_search_exa", "web_fetch_exa"]);
  });

  it("registers only supported tools from an explicit selection", () => {
    const server = new FakeMcpServer();

    initializeMcpServer(server, {
      enabledTools: ["web_search_advanced_exa", "removed_tool", "legacy_tool"],
      userProvidedApiKey: true,
    });

    expect(server.tools.map((tool) => tool.name)).toEqual(["web_search_advanced_exa"]);
  });

  it("registers opt-in Agent tools, prompt, and schema resource when authenticated", async () => {
    const server = new FakeMcpServer();

    initializeMcpServer(server, {
      enabledTools: ["agent_run"],
      userProvidedApiKey: true,
    });

    expect(server.tools.map((tool) => tool.name)).toEqual(["agent_run"]);
    expect(server.prompts.map((prompt) => prompt.name)).toEqual([
      "web_search_help",
      "agent_research_help",
    ]);
    expect(server.resources.map((resource) => resource.name)).toEqual([
      "tools_list",
      "agent_research_guide",
      "agent_schema_templates",
    ]);

    const agentGuide = await server.resources[1].handler();
    expect(agentGuide).toMatchObject({
      contents: [
        {
          uri: "exa://agent/skill",
          mimeType: "text/markdown",
        },
      ],
    });
    expect((agentGuide as any).contents[0].text).toContain("Exa Agent Research");
    expect((agentGuide as any).contents[0].text).toContain("agent_run");

    const agentPrompt = server.prompts.find((prompt) => prompt.name === "agent_research_help");
    expect(agentPrompt).toBeDefined();
    const promptResult = await agentPrompt!.handler();
    expect((promptResult as any).messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "user",
          content: expect.objectContaining({
            type: "resource",
            resource: expect.objectContaining({
              uri: "exa://agent/skill",
              mimeType: "text/markdown",
              text: expect.stringContaining("Exa Agent Research"),
            }),
          }),
        }),
      ]),
    );

    const schemaTemplates = await server.resources[2].handler();
    expect(schemaTemplates).toMatchObject({
      contents: [
        {
          uri: "exa://agent/schema-templates",
          mimeType: "application/json",
        },
      ],
    });
  });

  it("applies the analytics wrapServer hook to the underlying server when provided", () => {
    const wrapServer = vi.fn();
    const server = new FakeMcpServer();

    initializeMcpServer(server, { analytics: { wrapServer } });

    expect(wrapServer).toHaveBeenCalledTimes(1);
    expect(wrapServer).toHaveBeenCalledWith(server.server);
  });

  it("initializes without analytics and survives a throwing wrapServer hook", () => {
    initializeMcpServer(new FakeMcpServer());
    initializeMcpServer(new FakeMcpServer(), { analytics: {} });

    const server = new FakeMcpServer();
    initializeMcpServer(server, {
      analytics: {
        wrapServer: () => {
          throw new Error("provider failure");
        },
      },
    });

    expect(server.tools.map((tool) => tool.name)).toEqual(["web_search_exa", "web_fetch_exa"]);
  });

  it("does not register Agent tools without user-provided auth", async () => {
    const server = new FakeMcpServer();

    initializeMcpServer(server, {
      enabledTools: ["agent_run"],
      userProvidedApiKey: false,
    });

    expect(server.tools).toEqual([]);
    expect(server.prompts.map((prompt) => prompt.name)).toEqual(["web_search_help"]);
    expect(server.resources.map((resource) => resource.name)).toEqual(["tools_list"]);

    const resourceResult = await server.resources[0].handler();
    const toolsList = JSON.parse((resourceResult as any).contents[0].text);
    expect(toolsList).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "agent_run", enabled: false })]),
    );
  });
});
