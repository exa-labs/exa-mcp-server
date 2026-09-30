/**
 * Integration harness for exa-mcp-server.
 *
 * Every suite drives the container runtime's HTTP server (src/runtime.ts) over
 * loopback, exactly as an MCP client reaches a deployed instance, with the Exa
 * API replaced by `FakeExaApi` — an HTTP double that `EXA_API_BASE_URL` points
 * the tools at. Each test scripts the replies it needs and inspects the calls
 * the server made.
 *
 * `startInProcessServer` serves from the test process; `ServerProcess` runs the
 * entrypoint (src/runtime-server.ts) as its own Node process for behavior that
 * ends the process (signal handling).
 */
import { spawn, type ChildProcess } from "node:child_process";
import {
  createServer,
  type IncomingHttpHeaders,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { createServer as createNetServer, type AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { RuntimeServerOptions } from "../../src/runtime.js";

/** Repository root (tests/integration/..). */
export const PROJECT_ROOT = fileURLToPath(new URL("../..", import.meta.url));

/** The TCP port a listening server is bound to. */
function listeningPort(server: { address(): AddressInfo | string | null }): number {
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error(`expected a listening TCP server, got address ${String(address)}`);
  }
  return address.port;
}

/** Bind `server` to an ephemeral loopback port. */
async function listenOnLoopback(server: {
  once(event: "error", listener: (error: Error) => void): unknown;
  listen(port: number, host: string, callback: () => void): unknown;
}): Promise<void> {
  await new Promise<void>((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });
}

/** Reserve an ephemeral loopback port and release it for the caller to bind. */
export async function freePort(): Promise<number> {
  const server = createNetServer();
  await listenOnLoopback(server);
  const port = listeningPort(server);
  await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
  return port;
}

/** Poll `check` until it returns true, failing with `what` after `timeoutMs`. */
export async function waitFor(
  check: () => Promise<boolean> | boolean,
  what: string,
  timeoutMs = 15_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      if (await check()) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(`Timed out after ${timeoutMs}ms waiting for ${what}`, { cause: lastError });
}

/** One request the server sent to the Exa API double. */
export interface ExaApiCall {
  method: string;
  path: string;
  headers: IncomingHttpHeaders;
  body: unknown;
}

/** The double's answer to one call. */
export interface ExaApiReply {
  status: number;
  body: unknown;
  /** Hold the response this long before answering. */
  delayMs?: number;
}

type ExaApiHandler = (call: ExaApiCall) => ExaApiReply;

/**
 * HTTP double of the Exa API that records calls and answers with scripted
 * replies. A call the double itself cannot serve (unparsable body, throwing
 * handler) is answered 500 and recorded in `failures`, so the server sees an
 * upstream error and the test can tell the two apart.
 */
export class FakeExaApi {
  readonly calls: ExaApiCall[] = [];
  readonly failures: unknown[] = [];
  private readonly server: Server;
  private handler: ExaApiHandler = (call) => ({
    status: 500,
    body: { error: `FakeExaApi: no reply scripted for ${call.method} ${call.path}` },
  });

  private constructor() {
    this.server = createServer((req, res) => {
      this.serve(req, res).catch((error: unknown) => {
        this.failures.push(error);
        if (!res.headersSent) res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: `FakeExaApi failed: ${String(error)}` }));
      });
    });
  }

  static async start(): Promise<FakeExaApi> {
    const api = new FakeExaApi();
    await listenOnLoopback(api.server);
    return api;
  }

  get url(): string {
    return `http://127.0.0.1:${listeningPort(this.server)}`;
  }

  /** Script the reply for every following call and forget earlier calls. */
  respondWith(handler: ExaApiHandler): void {
    this.calls.length = 0;
    this.handler = handler;
  }

  /** Calls made to `path`, in arrival order. */
  callsTo(path: string): ExaApiCall[] {
    return this.calls.filter((call) => call.path === path);
  }

  async close(): Promise<void> {
    this.server.closeAllConnections();
    await new Promise<void>((resolveClose) => this.server.close(() => resolveClose()));
  }

  private async serve(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    }
    const raw = Buffer.concat(chunks).toString("utf8");
    const call: ExaApiCall = {
      method: req.method ?? "GET",
      path: new URL(req.url ?? "/", "http://fake").pathname,
      headers: req.headers,
      body: raw ? JSON.parse(raw) : undefined,
    };
    this.calls.push(call);
    const reply = this.handler(call);
    if (reply.delayMs) await new Promise((r) => setTimeout(r, reply.delayMs));
    res.writeHead(reply.status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(reply.body));
  }
}

/** Where a started server serves MCP. */
export interface ServedMcp {
  url: string;
}

/**
 * Serve src/runtime.ts inside the test process with `env` applied. The env is
 * set before the server's module graph loads, since some settings (the OAuth
 * issuer) are read at import; call it once per file (vitest runs each file in
 * its own process).
 */
export async function startInProcessServer(
  env: Record<string, string>,
  options?: RuntimeServerOptions,
): Promise<ServedMcp> {
  Object.assign(process.env, env);
  const { createRuntimeServer } = await import("../../src/runtime.js");
  const server = createRuntimeServer(options);
  await listenOnLoopback(server);
  return { url: `http://127.0.0.1:${listeningPort(server)}` };
}

/** How a `ServerProcess` ended. */
export interface ProcessExit {
  code: number | null;
  signal: NodeJS.Signals | null;
}

/** The runtime entrypoint (src/runtime-server.ts) running as its own Node process. */
export class ServerProcess implements ServedMcp {
  private output = "";

  private constructor(
    private readonly child: ChildProcess,
    readonly url: string,
    readonly exited: Promise<ProcessExit>,
  ) {
    child.stdout?.on("data", (chunk: Buffer) => (this.output += chunk.toString()));
    child.stderr?.on("data", (chunk: Buffer) => (this.output += chunk.toString()));
  }

  static async start(env: Record<string, string>): Promise<ServerProcess> {
    const port = await freePort();
    const child = spawn(process.execPath, ["--import", "tsx", "src/runtime-server.ts"], {
      cwd: PROJECT_ROOT,
      env: { ...process.env, HOST: "127.0.0.1", PORT: String(port), ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const exited = new Promise<ProcessExit>((resolveExit) =>
      child.once("exit", (code, signal) => resolveExit({ code, signal })),
    );
    const served = new ServerProcess(child, `http://127.0.0.1:${port}`, exited);
    await waitFor(async () => (await fetch(`${served.url}/ping`)).ok, `${served.url}/ping`);
    return served;
  }

  /** Everything the process wrote to stdout and stderr so far. */
  get logs(): string {
    return this.output;
  }

  signal(signal: NodeJS.Signals): void {
    this.child.kill(signal);
  }

  /** Kill the process if it is still running. */
  stop(): void {
    if (this.child.exitCode === null && this.child.signalCode === null) {
      this.child.kill("SIGKILL");
    }
  }
}

/**
 * Connect an MCP SDK client to the served `/mcp` endpoint, sending `headers`
 * on every request. `query` is appended to the endpoint URL, the way a
 * connector configured with `?exaApiKey=` reaches the server.
 */
export async function connectMcpClient(
  served: ServedMcp,
  headers: Record<string, string> = {},
  query: Record<string, string> = {},
): Promise<Client> {
  const client = new Client({ name: "exa-mcp-integration", version: "1.0.0" });
  const endpoint = new URL("/mcp", served.url);
  endpoint.search = new URLSearchParams(query).toString();
  const transport = new StreamableHTTPClientTransport(endpoint, {
    requestInit: { headers },
  });
  await client.connect(transport);
  return client;
}

/** A raw JSON-RPC exchange with `/mcp`: the HTTP status, body, and decoded message. */
export interface McpHttpReply {
  status: number;
  headers: Headers;
  text: string;
  message: { result?: unknown; error?: { code: number; message: string } } | undefined;
}

/**
 * POST one JSON-RPC message to `/mcp` without an MCP client, for assertions
 * on the HTTP layer. Decodes both JSON and single-event SSE replies. `path`
 * may carry the endpoint's query parameters (`/mcp?tools=...`).
 */
export async function postMcp(
  served: ServedMcp,
  message: Record<string, unknown>,
  headers: Record<string, string> = {},
  path = "/mcp",
): Promise<McpHttpReply> {
  const response = await fetch(new URL(path, served.url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...headers,
    },
    body: JSON.stringify({ jsonrpc: "2.0", ...message }),
  });
  const text = await response.text();
  const payload = (response.headers.get("content-type") ?? "").includes("text/event-stream")
    ? text
        .split("\n")
        .find((line) => line.startsWith("data: "))
        ?.slice("data: ".length)
    : text;
  return {
    status: response.status,
    headers: response.headers,
    text,
    message: payload ? JSON.parse(payload) : undefined,
  };
}

/** A `tools/call` JSON-RPC message for `web_search_exa`. */
export function webSearchCall(query: string, id = 1): Record<string, unknown> {
  return { id, method: "tools/call", params: { name: "web_search_exa", arguments: { query } } };
}

/** A minimal successful Exa `/search` response body. */
export function searchResults(...urls: string[]): Record<string, unknown> {
  return {
    requestId: "req-integration",
    results: urls.map((url, i) => ({
      id: url,
      url,
      title: `Result ${i + 1}`,
      highlights: [`highlight for ${url}`],
    })),
    costDollars: { total: 0.005 },
  };
}
