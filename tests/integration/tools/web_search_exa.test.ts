/**
 * End-to-end tool test for `web_search_exa`.
 *
 * Drives `tools/call` through the in-memory MCP client with `exa-js` mocked,
 * so we can assert exactly the outbound request payload our tool constructs
 * and the formatted text we hand back to the model.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";

vi.mock("exa-js", () => import("../../helpers/exa-mock.js"));
vi.mock("agnost", () => ({
  trackMCP: vi.fn(),
  createConfig: vi.fn((c) => c),
  checkpoint: vi.fn(),
}));

import { ExaError } from "exa-js";
import {
  requestSpy,
  resetExaMock,
  setExaRequestImpl,
} from "../../helpers/exa-mock.js";
import { SEARCH_RESPONSE_BASIC, SEARCH_RESPONSE_EMPTY } from "../../fixtures/exa-responses.js";
import { buildTestServer, type TestServer } from "../../helpers/mcp-test-server.js";

let server: TestServer;

beforeEach(async () => {
  resetExaMock();
});

afterEach(async () => {
  if (server) {
    await server.cleanup();
  }
});

describe("web_search_exa via tools/call", () => {
  it("constructs the search payload, sanitizes results, and formats the response text", async () => {
    setExaRequestImpl(async () => SEARCH_RESPONSE_BASIC);

    server = await buildTestServer({
      enabledTools: ["web_search_exa"],
      exaApiKey: "sk-test",
      defaultSearchType: "auto",
    });

    const result = await server.client.request(
      {
        method: "tools/call",
        params: {
          name: "web_search_exa",
          arguments: { query: "best blog post on react performance", numResults: 5 },
        },
      },
      CallToolResultSchema,
    );

    // Outbound request inspection.
    expect(requestSpy).toHaveBeenCalledOnce();
    const [endpoint, method, body, , headers] = requestSpy.mock.calls[0];
    expect(endpoint).toBe("/search");
    expect(method).toBe("POST");
    expect(body).toMatchObject({
      query: "best blog post on react performance",
      type: "auto",
      numResults: 5,
      contents: { highlights: { query: "best blog post on react performance", maxCharacters: 2000 } },
    });
    expect(headers).toEqual({ "x-exa-integration": "web-search-mcp" });

    // Returned text content.
    expect(result.isError).toBeFalsy();
    const text = result.content[0].type === "text" ? result.content[0].text : "";
    expect(text).toContain("First Result");
    expect(text).toContain("https://example.com/one");
    expect(text).toContain("First highlight.");
    // requestTags MUST NOT leak into the formatted response.
    expect(text).not.toContain("internalDebug");
    expect(text).not.toContain("should-be-stripped");
  });

  it("extracts category:people from the query and removes it before sending", async () => {
    setExaRequestImpl(async () => SEARCH_RESPONSE_BASIC);

    server = await buildTestServer({ enabledTools: ["web_search_exa"], exaApiKey: "k" });

    await server.client.request(
      {
        method: "tools/call",
        params: {
          name: "web_search_exa",
          arguments: { query: "category:people John Doe software engineer" },
        },
      },
      CallToolResultSchema,
    );

    const body = requestSpy.mock.calls[0][2] as Record<string, unknown>;
    expect(body.category).toBe("people");
    expect(body.query).toBe("John Doe software engineer");
  });

  it("returns the no-results message when Exa returns an empty results array", async () => {
    setExaRequestImpl(async () => SEARCH_RESPONSE_EMPTY);

    server = await buildTestServer({ enabledTools: ["web_search_exa"], exaApiKey: "k" });

    const result = await server.client.request(
      { method: "tools/call", params: { name: "web_search_exa", arguments: { query: "x" } } },
      CallToolResultSchema,
    );
    const text = result.content[0].type === "text" ? result.content[0].text : "";
    expect(text).toContain("No search results found");
  });

  it("formats ExaError into an isError tool response", async () => {
    setExaRequestImpl(async () => {
      throw new ExaError("forbidden", 403);
    });

    server = await buildTestServer({ enabledTools: ["web_search_exa"], exaApiKey: "k" });

    const result = await server.client.request(
      { method: "tools/call", params: { name: "web_search_exa", arguments: { query: "x" } } },
      CallToolResultSchema,
    );
    expect(result.isError).toBe(true);
    const text = result.content[0].type === "text" ? result.content[0].text : "";
    expect(text).toContain("web_search_exa error (403): forbidden");
  });

  it("surfaces the free-tier rate-limit message when 429 + no user-provided key", async () => {
    setExaRequestImpl(async () => {
      throw new ExaError("rate-limited", 429);
    });

    server = await buildTestServer({
      enabledTools: ["web_search_exa"],
      exaApiKey: "k",
      userProvidedApiKey: false,
    });

    const result = await server.client.request(
      { method: "tools/call", params: { name: "web_search_exa", arguments: { query: "x" } } },
      CallToolResultSchema,
    );
    const text = result.content[0].type === "text" ? result.content[0].text : "";
    expect(text).toContain("Exa's free MCP rate limit");
  });
});
