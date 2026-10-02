/**
 * web_search_exa through the served MCP endpoint: what an MCP client gets back
 * when the Exa API answers, answers slowly, fails transiently, or rejects the
 * key — and which key the server spends on the caller's behalf.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  connectMcpClient,
  FakeExaApi,
  postMcp,
  searchResults,
  startInProcessServer,
  webSearchCall,
  type ServedMcp,
} from "./harness.js";

const CONTAINER_KEY = "container-env-key";
const SSE_KEEPALIVE_MS = 50;

let exaApi: FakeExaApi;
let served: ServedMcp;
const clients: Client[] = [];

beforeAll(async () => {
  exaApi = await FakeExaApi.start();
  served = await startInProcessServer(
    { EXA_API_BASE_URL: exaApi.url, EXA_API_KEY: CONTAINER_KEY },
    { sseKeepaliveMs: SSE_KEEPALIVE_MS },
  );
});

afterAll(async () => {
  await Promise.all(clients.map((client) => client.close()));
  await exaApi.close();
});

async function client(headers: Record<string, string> = {}): Promise<Client> {
  const connected = await connectMcpClient(served, headers);
  clients.push(connected);
  return connected;
}

/** The text of a tool result's single content block. */
function resultText(result: Awaited<ReturnType<Client["callTool"]>>): string {
  const content = result.content as Array<{ type: string; text: string }>;
  expect(content).toHaveLength(1);
  return content[0].text;
}

describe("web_search_exa over MCP", () => {
  it("advertises search, fetch, and agent_run to a caller with their own key", async () => {
    const mcp = await client({ "x-api-key": "caller-key" });

    const { tools } = await mcp.listTools();

    expect(tools.map((tool) => tool.name)).toEqual([
      "web_search_exa",
      "web_fetch_exa",
      "agent_run",
    ]);
  });

  it("searches with the caller's own API key and renders the results", async () => {
    exaApi.respondWith(() => ({
      status: 200,
      body: searchResults("https://exa.ai/", "https://docs.exa.ai/"),
    }));
    const mcp = await client({ "x-api-key": "caller-key" });

    const result = await mcp.callTool({
      name: "web_search_exa",
      arguments: {
        query: "neural search engines",
        numResults: 2,
        objective: "Rank engineering blog posts first",
      },
    });

    expect(result.isError).toBeFalsy();
    expect(resultText(result)).toContain("Title: Result 1\nURL: https://exa.ai/");
    expect(resultText(result)).toContain("URL: https://docs.exa.ai/");
    const [call] = exaApi.callsTo("/search");
    expect(call.headers["x-api-key"]).toBe("caller-key");
    expect(call.headers["x-exa-integration"]).toBe("web-search-mcp");
    expect(call.body).toMatchObject({
      query: "neural search engines",
      numResults: 2,
      objective: "Rank engineering blog posts first",
    });
  });

  it("runs credential-less callers on the container's EXA_API_KEY", async () => {
    exaApi.respondWith(() => ({ status: 200, body: searchResults("https://exa.ai/") }));
    const mcp = await client();

    const result = await mcp.callTool({ name: "web_search_exa", arguments: { query: "exa" } });

    expect(result.isError).toBeFalsy();
    expect(exaApi.callsTo("/search")[0].headers["x-api-key"]).toBe(CONTAINER_KEY);
  });

  it("retries transient Exa API failures before answering", async () => {
    let attempts = 0;
    exaApi.respondWith(() =>
      ++attempts <= 2
        ? { status: 503, body: { error: "Service Unavailable" } }
        : { status: 200, body: searchResults("https://exa.ai/") },
    );
    const mcp = await client({ "x-api-key": "caller-key" });

    const result = await mcp.callTool({ name: "web_search_exa", arguments: { query: "exa" } });

    expect(result.isError).toBeFalsy();
    expect(resultText(result)).toContain("URL: https://exa.ai/");
    expect(exaApi.callsTo("/search")).toHaveLength(3);
  });

  it("reports a rejected API key as a tool error without retrying", async () => {
    exaApi.respondWith(() => ({ status: 401, body: { error: "Invalid API key" } }));
    const mcp = await client({ "x-api-key": "revoked-key" });

    const result = await mcp.callTool({ name: "web_search_exa", arguments: { query: "exa" } });

    expect(result.isError).toBe(true);
    expect(resultText(result)).toContain("web_search_exa error (401): Invalid API key");
    expect(exaApi.callsTo("/search")).toHaveLength(1);
  });

  it("keeps a slow tool call's event stream alive with SSE comments", async () => {
    exaApi.respondWith(() => ({
      status: 200,
      body: searchResults("https://exa.ai/"),
      delayMs: SSE_KEEPALIVE_MS * 6,
    }));

    const reply = await postMcp(served, webSearchCall("exa"), { "x-api-key": "caller-key" });

    expect(reply.status).toBe(200);
    expect(reply.headers.get("content-type")).toContain("text/event-stream");
    expect(reply.text).toContain(": keepalive\n\n");
    expect(JSON.stringify(reply.message?.result)).toContain("URL: https://exa.ai/");
  });
});
