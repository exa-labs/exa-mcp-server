/**
 * In-memory MCP integration tests.
 *
 * Drives the *real* `initializeMcpServer()` end-to-end through the SDK Client
 * (over `InMemoryTransport`). Locks the prod tool surface, the resources
 * endpoint, and the prompt endpoint.
 *
 * `agnost` is mocked because `trackMCP` would otherwise attempt to phone home
 * to api.agnost.ai during test runs.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  GetPromptResultSchema,
  ListPromptsResultSchema,
  ListResourcesResultSchema,
  ListToolsResultSchema,
  ReadResourceResultSchema,
} from "@modelcontextprotocol/sdk/types.js";

vi.mock("agnost", () => ({
  trackMCP: vi.fn(),
  createConfig: vi.fn((c) => c),
  checkpoint: vi.fn(),
}));

import { buildTestServer } from "../helpers/mcp-test-server.js";

let active: Awaited<ReturnType<typeof buildTestServer>> | undefined;

afterEach(async () => {
  if (active) {
    await active.cleanup();
    active = undefined;
  }
});

describe("tools/list", () => {
  it("default config exposes the enabled tools (web_search_exa, web_fetch_exa)", async () => {
    active = await buildTestServer();
    const res = await active.client.request(
      { method: "tools/list", params: {} },
      ListToolsResultSchema,
    );
    const names = res.tools.map((t) => t.name).sort();
    expect(names).toEqual(["web_fetch_exa", "web_search_exa"]);
  });

  it("respects enabledTools and exposes only the requested set", async () => {
    active = await buildTestServer({ enabledTools: ["web_search_advanced_exa"] });
    const res = await active.client.request(
      { method: "tools/list", params: {} },
      ListToolsResultSchema,
    );
    expect(res.tools.map((t) => t.name)).toEqual(["web_search_advanced_exa"]);
  });

  it("gates deep_search_exa behind userProvidedApiKey", async () => {
    // Always include web_search_exa so the tools/list handler is registered
    // (the SDK only mounts the tools capability when at least one tool is
    // registered).
    active = await buildTestServer({
      enabledTools: ["web_search_exa", "deep_search_exa"],
      userProvidedApiKey: false,
    });
    const without = await active.client.request(
      { method: "tools/list", params: {} },
      ListToolsResultSchema,
    );
    expect(without.tools.map((t) => t.name)).not.toContain("deep_search_exa");
    await active.cleanup();

    active = await buildTestServer({
      enabledTools: ["web_search_exa", "deep_search_exa"],
      userProvidedApiKey: true,
    });
    const withKey = await active.client.request(
      { method: "tools/list", params: {} },
      ListToolsResultSchema,
    );
    expect(withKey.tools.map((t) => t.name)).toContain("deep_search_exa");
  });

  it("registers tool annotations on web_search_exa", async () => {
    active = await buildTestServer();
    const res = await active.client.request(
      { method: "tools/list", params: {} },
      ListToolsResultSchema,
    );
    const search = res.tools.find((t) => t.name === "web_search_exa");
    expect(search).toBeDefined();
    expect(search?.annotations).toMatchObject({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    });
  });
});

describe("resources/*", () => {
  it("lists exa://tools/list and reads back the tool catalog as JSON", async () => {
    active = await buildTestServer();

    const list = await active.client.request(
      { method: "resources/list", params: {} },
      ListResourcesResultSchema,
    );
    expect(list.resources.map((r) => r.uri)).toContain("exa://tools/list");

    const read = await active.client.request(
      { method: "resources/read", params: { uri: "exa://tools/list" } },
      ReadResourceResultSchema,
    );
    const content = read.contents[0];
    expect(content.mimeType).toBe("application/json");
    if (!("text" in content) || typeof content.text !== "string") {
      throw new Error("expected text contents on exa://tools/list resource");
    }

    const parsed = JSON.parse(content.text) as Array<{
      id: string;
      enabled: boolean;
      name: string;
    }>;
    const enabled = parsed.filter((t) => t.enabled).map((t) => t.id).sort();
    expect(enabled).toEqual(["web_fetch_exa", "web_search_exa"]);
    expect(parsed.find((t) => t.id === "deep_researcher_start")?.name).toContain("Deprecated");
  });
});

describe("prompts/*", () => {
  it("lists web_search_help and returns a non-empty user message", async () => {
    active = await buildTestServer();

    const list = await active.client.request(
      { method: "prompts/list", params: {} },
      ListPromptsResultSchema,
    );
    expect(list.prompts.map((p) => p.name)).toContain("web_search_help");

    const result = await active.client.request(
      { method: "prompts/get", params: { name: "web_search_help", arguments: {} } },
      GetPromptResultSchema,
    );
    expect(result.messages[0].role).toBe("user");
    const text =
      result.messages[0].content.type === "text"
        ? result.messages[0].content.text
        : "";
    expect(text.length).toBeGreaterThan(0);
  });
});


