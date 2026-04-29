/**
 * End-to-end tool test for `web_fetch_exa`.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";

vi.mock("exa-js", () => import("../../helpers/exa-mock.js"));
vi.mock("agnost", () => ({
  trackMCP: vi.fn(),
  createConfig: vi.fn((c) => c),
  checkpoint: vi.fn(),
}));

import {
  requestSpy,
  resetExaMock,
  setExaRequestImpl,
} from "../../helpers/exa-mock.js";
import { CONTENTS_RESPONSE_BASIC } from "../../fixtures/exa-responses.js";
import { buildTestServer, type TestServer } from "../../helpers/mcp-test-server.js";

let server: TestServer;

beforeEach(() => {
  resetExaMock();
});

afterEach(async () => {
  if (server) {
    await server.cleanup();
  }
});

describe("web_fetch_exa via tools/call", () => {
  it("accepts urls as an array, formats results, and surfaces per-URL errors", async () => {
    setExaRequestImpl(async () => CONTENTS_RESPONSE_BASIC);

    server = await buildTestServer({ enabledTools: ["web_fetch_exa"], exaApiKey: "k" });

    const result = await server.client.request(
      {
        method: "tools/call",
        params: {
          name: "web_fetch_exa",
          arguments: {
            urls: ["https://example.com/page", "https://broken.example.com"],
            maxCharacters: 1000,
          },
        },
      },
      CallToolResultSchema,
    );

    const [endpoint, method, body, , headers] = requestSpy.mock.calls[0];
    expect(endpoint).toBe("/contents");
    expect(method).toBe("POST");
    expect(body).toMatchObject({
      ids: ["https://example.com/page", "https://broken.example.com"],
      contents: { text: { maxCharacters: 1000 } },
    });
    expect(headers).toEqual({ "x-exa-integration": "crawling-mcp" });

    const text = result.content[0].type === "text" ? result.content[0].text : "";
    expect(text).toContain("# Example Page");
    expect(text).toContain("https://example.com/page");
    expect(text).toContain("Body of the page.");
    // The error for broken.example.com should be appended.
    expect(text).toContain("Error fetching https://broken.example.com");
    expect(text).toContain("FETCH_FAILED");
  });

  it("preprocesses urls when provided as a JSON-encoded string", async () => {
    setExaRequestImpl(async () => CONTENTS_RESPONSE_BASIC);

    server = await buildTestServer({ enabledTools: ["web_fetch_exa"], exaApiKey: "k" });

    await server.client.request(
      {
        method: "tools/call",
        params: {
          name: "web_fetch_exa",
          arguments: { urls: '["https://example.com/page"]' },
        },
      },
      CallToolResultSchema,
    );

    const body = requestSpy.mock.calls[0][2] as { ids: string[] };
    expect(body.ids).toEqual(["https://example.com/page"]);
  });

  it("returns isError text when all URLs fail", async () => {
    setExaRequestImpl(async () => ({
      requestId: "req",
      results: [],
      statuses: [
        { id: "https://a", status: "error", source: "live", error: { tag: "FETCH_FAILED" } },
      ],
    }));

    server = await buildTestServer({ enabledTools: ["web_fetch_exa"], exaApiKey: "k" });

    const result = await server.client.request(
      {
        method: "tools/call",
        params: { name: "web_fetch_exa", arguments: { urls: ["https://a"] } },
      },
      CallToolResultSchema,
    );

    expect(result.isError).toBe(true);
    const text = result.content[0].type === "text" ? result.content[0].text : "";
    expect(text).toContain("Error fetching URL(s)");
    expect(text).toContain("FETCH_FAILED");
  });
});
