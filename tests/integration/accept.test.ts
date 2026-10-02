/** Accept negotiation through the runtime server's real HTTP transport. */
import { beforeAll, describe, expect, it } from "vitest";
import { startInProcessServer, type ServedMcp } from "./harness.js";

let served: ServedMcp;

beforeAll(async () => {
  served = await startInProcessServer({ EXA_API_KEY: "" });
});

describe("MCP Accept negotiation", () => {
  it.each([
    "application/json;text/event-stream",
    "application/json.text/event-stream",
    'application/json;note="text/event-stream"',
    "application/json, text/event-stream;q=0",
    "application/json;q=0, text/event-stream",
    "application/json, text/event-stream;q=invalid",
    "application/json",
    "text/event-stream",
    "",
  ])("rejects %j before dispatching the request", async (accept) => {
    const response = await fetch(`${served.url}/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: accept },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    expect(response.status).toBe(406);
    expect(await response.json()).toMatchObject({ error: { code: -32000 } });
  });

  it.each([
    "application/json, text/event-stream",
    'APPLICATION/JSON;note="comma,semi;colon", TEXT/EVENT-STREAM;q=0.5',
  ])("serves tools/list with %j", async (accept) => {
    const response = await fetch(`${served.url}/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: accept },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('"tools":');
  });
});
