import { describe, expect, it, vi } from "vitest";
import { checkpoint, trackMCP } from "agnost";
import {
  AVAILABLE_TOOL_IDS,
  TOOL_REGISTRY,
  expandToolSelection,
  isAgentTool,
  listToolMetadata,
  registerAgentRunTool,
  registerWebFetchTool,
  registerWebSearchAdvancedTool,
  registerWebSearchTool,
  requiresUserProvidedApiKey,
} from "../../src/index.js";
import { FakeMcpServer } from "../helpers/fakeMcpServer.js";

vi.mock("agnost", () => ({
  checkpoint: vi.fn(),
  createConfig: vi.fn((config: unknown) => config),
  trackMCP: vi.fn(),
}));

/**
 * The piecemeal embedding path: a consumer registers individual tools onto
 * their own McpServer without going through initializeMcpServer or the stdio
 * entrypoint, and must not inherit any analytics side effects.
 */
describe("piecemeal library embedding", () => {
  it("registers individual tools onto a plain server without tracking side effects", () => {
    const server = new FakeMcpServer();
    const config = { exaApiKey: "embedder-key" };

    registerWebSearchTool(server as any, config);
    registerWebSearchAdvancedTool(server as any, config);
    registerWebFetchTool(server as any, config);
    registerAgentRunTool(server as any, config);

    expect(server.tools.map((tool) => tool.name)).toEqual([
      "web_search_exa",
      "web_search_advanced_exa",
      "web_fetch_exa",
      "agent_run",
    ]);
    expect(server.prompts).toEqual([]);
    expect(server.resources).toEqual([]);

    expect(trackMCP).not.toHaveBeenCalled();
    expect(checkpoint).not.toHaveBeenCalled();
  });

  it("exposes the registry helpers needed to drive tool selection standalone", () => {
    expect(AVAILABLE_TOOL_IDS).toEqual(
      expect.arrayContaining([
        "web_search_exa",
        "web_search_advanced_exa",
        "web_fetch_exa",
        "agent_run",
      ]),
    );
    expect(TOOL_REGISTRY.web_search_exa.enabled).toBe(true);

    expect(expandToolSelection(["agent_tools", "web_search_exa"])).toEqual([
      "agent_run",
      "web_search_exa",
    ]);
    expect(requiresUserProvidedApiKey("agent_run")).toBe(true);
    expect(isAgentTool("agent_run")).toBe(true);
    expect(isAgentTool("web_search_exa")).toBe(false);

    const metadata = listToolMetadata(["web_search_exa"]);
    expect(metadata).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "web_search_exa", enabled: true }),
        expect.objectContaining({ id: "agent_run", enabled: false }),
      ]),
    );
  });
});
