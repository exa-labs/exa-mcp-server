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
        expect.objectContaining({ id: "agent_create_run", enabled: false }),
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

  it("registers opt-in Agent tools, prompt, and schema resource when authenticated", async () => {
    const server = new FakeMcpServer();

    initializeMcpServer(server, {
      enabledTools: ["agent_create_run", "agent_wait_for_run", "agent_get_run_output", "agent_cancel_run"],
      userProvidedApiKey: true,
    });

    expect(server.tools.map((tool) => tool.name)).toEqual([
      "agent_create_run",
      "agent_wait_for_run",
      "agent_get_run_output",
      "agent_cancel_run",
    ]);
    expect(server.prompts.map((prompt) => prompt.name)).toEqual(["web_search_help", "agent_research_help"]);
    expect(server.resources.map((resource) => resource.name)).toEqual(["tools_list", "agent_research_guide", "agent_schema_templates"]);

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
    expect((agentGuide as any).contents[0].text).toContain("agent_create_run");

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

  it("does not register Agent tools without user-provided auth", async () => {
    const server = new FakeMcpServer();

    initializeMcpServer(server, {
      enabledTools: ["agent_create_run", "agent_wait_for_run", "agent_get_run_output", "agent_cancel_run"],
      userProvidedApiKey: false,
    });

    expect(server.tools).toEqual([]);
    expect(server.prompts.map((prompt) => prompt.name)).toEqual(["web_search_help"]);
    expect(server.resources.map((resource) => resource.name)).toEqual(["tools_list"]);

    const resourceResult = await server.resources[0].handler();
    const toolsList = JSON.parse((resourceResult as any).contents[0].text);
    expect(toolsList).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "agent_create_run", enabled: false }),
        expect.objectContaining({ id: "agent_wait_for_run", enabled: false }),
      ]),
    );
  });
});
