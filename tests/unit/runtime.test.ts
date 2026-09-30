import { connect, type AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const { handlerMock } = vi.hoisted(() => ({ handlerMock: vi.fn() }));

vi.mock("../../api/mcp.js", () => ({
  GET: handlerMock,
  POST: handlerMock,
  DELETE: handlerMock,
  OPTIONS: handlerMock,
}));

const { createRuntimeServer } = await import("../../src/runtime.js");

const KEEPALIVE_MS = 20;

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  server = createRuntimeServer({ sseKeepaliveMs: KEEPALIVE_MS });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  handlerMock.mockReset();
  delete process.env.EXA_API_KEY;
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** A response body the test writes chunk by chunk, pausing between writes. */
function scriptedBody(steps: Array<string | number>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      for (const step of steps) {
        if (typeof step === "number") await sleep(step);
        else controller.enqueue(encoder.encode(step));
      }
      controller.close();
    },
  });
}

/** Send a raw HTTP request line (bypassing fetch's URL normalization) and return the status line. */
async function rawStatusLine(requestLine: string): Promise<string> {
  const { port } = server.address() as AddressInfo;
  return new Promise((resolve, reject) => {
    const socket = connect(port, "127.0.0.1", () => {
      socket.write(`${requestLine}\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n`);
    });
    let received = "";
    socket.on("data", (data) => (received += data.toString()));
    socket.on("end", () => resolve(received.split("\r\n")[0]));
    socket.on("error", reject);
  });
}

describe("runtime server", () => {
  it("answers /ping without reaching the MCP handler", async () => {
    const response = await fetch(`${baseUrl}/ping`);

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("ok\n");
    expect(handlerMock).not.toHaveBeenCalled();
  });

  it("rejects an unparseable request target with 400", async () => {
    await expect(rawStatusLine("GET // HTTP/1.1")).resolves.toBe("HTTP/1.1 400 Bad Request");
    expect(handlerMock).not.toHaveBeenCalled();
  });

  it("rejects unsupported methods with 405", async () => {
    const response = await fetch(`${baseUrl}/mcp`, { method: "PUT" });

    expect(response.status).toBe(405);
    await expect(response.json()).resolves.toEqual({ error: "Method not allowed" });
    expect(handlerMock).not.toHaveBeenCalled();
  });

  it("forwards the request and runs credential-less callers on the container's EXA_API_KEY", async () => {
    process.env.EXA_API_KEY = "container-key";
    handlerMock.mockResolvedValue(new Response("{}", { status: 200 }));

    await fetch(`${baseUrl}/mcp?tools=web_search_exa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"jsonrpc":"2.0","id":1,"method":"tools/list"}',
    });
    await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: { Authorization: "Bearer caller-key" },
      body: "{}",
    });

    const [anonymous, withCredential] = handlerMock.mock.calls.map(
      ([request]) => request as Request,
    );
    expect(anonymous.method).toBe("POST");
    expect(new URL(anonymous.url).pathname).toBe("/mcp");
    expect(new URL(anonymous.url).searchParams.get("tools")).toBe("web_search_exa");
    expect(anonymous.headers.get("x-api-key")).toBe("container-key");
    await expect(anonymous.text()).resolves.toBe('{"jsonrpc":"2.0","id":1,"method":"tools/list"}');
    expect(withCredential.headers.get("x-api-key")).toBeNull();
    expect(withCredential.headers.get("authorization")).toBe("Bearer caller-key");
  });

  it("answers 500 when the MCP handler throws", async () => {
    handlerMock.mockRejectedValue(new Error("transport failed"));

    const response = await fetch(`${baseUrl}/mcp`);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Internal server error" });
  });

  it("keeps an idle event stream alive with comments written only between events", async () => {
    handlerMock.mockResolvedValue(
      new Response(
        scriptedBody([
          "event: message\ndata: 1\n\n",
          KEEPALIVE_MS * 4,
          "event: message\n",
          KEEPALIVE_MS * 4,
          "data: 2\n\n",
        ]),
        { headers: { "Content-Type": "text/event-stream" } },
      ),
    );

    const text = await (await fetch(`${baseUrl}/mcp`)).text();

    expect(text).toMatch(
      /^event: message\ndata: 1\n\n(: keepalive\n\n)+event: message\ndata: 2\n\n$/,
    );
  });

  it("never adds keepalives to responses that are not event streams", async () => {
    handlerMock.mockResolvedValue(
      new Response(scriptedBody(['{"a":', KEEPALIVE_MS * 4, "1}"]), {
        headers: { "Content-Type": "application/json" },
      }),
    );

    const response = await fetch(`${baseUrl}/mcp`);

    await expect(response.text()).resolves.toBe('{"a":1}');
  });
});
