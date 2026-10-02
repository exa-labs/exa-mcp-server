/**
 * Node HTTP server for the container runtime (see Dockerfile).
 *
 * Hosts the fetch-style MCP handlers from api/mcp.ts behind node:http. The
 * process entrypoint is src/runtime-server.ts.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { DELETE, GET, OPTIONS, POST } from "../api/mcp.js";
import { parseRequestTarget } from "./utils/requestTarget.js";

type Handler = (request: Request) => Promise<Response> | Response;

/**
 * SSE responses idle between events (a long tool call sends nothing until it
 * completes unless the client passed a progressToken), and proxies in front of
 * the runtime close responses that stay idle too long. Comment lines are part
 * of the SSE grammar and ignored by clients, so an idle-triggered comment keeps
 * the connection alive without touching the event stream.
 */
export const SSE_KEEPALIVE_MS = 25_000;
const SSE_KEEPALIVE_COMMENT = ": keepalive\n\n";
const NEWLINE = 0x0a;

const DEFAULT_SHUTDOWN_TIMEOUT_SECS = 10;

export interface RuntimeServerOptions {
  /** Idle time after which an event stream gets a keepalive comment. */
  sseKeepaliveMs?: number;
}

/** The client hung up (or the connection broke) before the request body arrived. */
class ClientBodyAbortError extends Error {}

function handlerForMethod(method: string | undefined): Handler | undefined {
  switch (method) {
    case "GET":
      return GET;
    case "POST":
      return POST;
    case "DELETE":
      return DELETE;
    case "OPTIONS":
      return OPTIONS;
    default:
      return undefined;
  }
}

function sendJsonError(res: ServerResponse, status: number, error: string): void {
  if (res.headersSent) {
    // The response is already partly written; cut it off rather than append
    // an error body that would make it look complete.
    res.destroy();
    return;
  }
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error }));
}

// The body is buffered rather than streamed: MCP request bodies are small
// JSON-RPC payloads, and a buffered body keeps a mid-body client abort as a
// distinguishable 400 instead of a stream error surfacing later as a 500.
async function toWebRequest(req: IncomingMessage, url: URL): Promise<Request> {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item);
    } else {
      headers.set(name, value);
    }
  }

  // The container's EXA_API_KEY is the operator's own key, not a shared
  // free-tier key: requests that bring no credential run on it.
  const hasInboundApiKey =
    headers.has("x-api-key") || headers.has("authorization") || url.searchParams.has("exaApiKey");
  if (!hasInboundApiKey && process.env.EXA_API_KEY) {
    headers.set("x-api-key", process.env.EXA_API_KEY);
  }

  const method = req.method ?? "GET";
  let body: string | undefined;
  if (method !== "GET" && method !== "HEAD") {
    const chunks: Buffer[] = [];
    try {
      for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
    } catch (error) {
      throw new ClientBodyAbortError("Client aborted while sending the request body", {
        cause: error,
      });
    }
    if (chunks.length > 0) body = Buffer.concat(chunks).toString();
  }

  return new Request(url, { method, headers, body });
}

/**
 * Write a web `Response` to a Node response. An event stream that goes
 * `keepaliveMs` without output gets a keepalive comment, written only where
 * an event ended so it never splits a partially written event.
 */
export async function writeWebResponse(
  res: ServerResponse,
  response: Response,
  keepaliveMs = SSE_KEEPALIVE_MS,
): Promise<void> {
  const headers: Record<string, string | string[]> = {};
  response.headers.forEach((value, key) => {
    const existing = headers[key];
    if (existing === undefined) {
      headers[key] = value;
    } else {
      headers[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
    }
  });
  if (response.statusText) res.statusMessage = response.statusText;
  res.writeHead(response.status, headers);

  const isEventStream = (response.headers.get("content-type") ?? "").includes("text/event-stream");
  let keepaliveTimer: NodeJS.Timeout | undefined;
  // The last two bytes written; an event ends with a blank line ("\n\n").
  let tail = [NEWLINE, NEWLINE];
  if (isEventStream && response.body) {
    keepaliveTimer = setInterval(() => {
      if (!res.writableEnded && tail[0] === NEWLINE && tail[1] === NEWLINE) {
        res.write(SSE_KEEPALIVE_COMMENT);
      }
    }, keepaliveMs);
    keepaliveTimer.unref();
  }

  try {
    if (response.body) {
      for await (const chunk of response.body) {
        keepaliveTimer?.refresh();
        res.write(chunk);
        if (chunk.length >= 2) {
          tail = [chunk[chunk.length - 2], chunk[chunk.length - 1]];
        } else if (chunk.length === 1) {
          tail = [tail[1], chunk[0]];
        }
      }
    }
  } finally {
    if (keepaliveTimer) clearInterval(keepaliveTimer);
  }
  res.end();
}

/** Create the runtime HTTP server without binding it. */
export function createRuntimeServer(options: RuntimeServerOptions = {}): Server {
  const server = createServer((req, res) => {
    // Once close() has stopped the listener, connections are not reused: a
    // kept-alive connection would take new requests the shutdown then cuts
    // off, and would hold the drain open until its keep-alive timeout.
    res.on("finish", () => {
      if (!server.listening) server.closeIdleConnections();
    });

    const url = parseRequestTarget(req.url, req.headers.host);
    // An unparseable target is a malformed request, not a server fault.
    if (url === null) {
      sendJsonError(res, 400, "Bad request target");
      return;
    }

    if (req.method === "GET" && url.pathname === "/ping") {
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("ok\n");
      return;
    }

    const handler = handlerForMethod(req.method);
    if (!handler) {
      sendJsonError(res, 405, "Method not allowed");
      return;
    }

    toWebRequest(req, url)
      .then((request) => handler(request))
      .then((response) => {
        if (!server.listening) res.setHeader("Connection", "close");
        return writeWebResponse(res, response, options.sseKeepaliveMs);
      })
      .catch((error: unknown) => {
        if (error instanceof ClientBodyAbortError) {
          sendJsonError(res, 400, "Client closed request");
          return;
        }
        console.error("[EXA-MCP] Runtime request failed:", error);
        sendJsonError(res, 500, "Internal server error");
      });
  });
  return server;
}

function shutdownTimeoutMs(): number {
  const seconds = Number(process.env.SHUTDOWN_TIMEOUT_SECS || DEFAULT_SHUTDOWN_TIMEOUT_SECS);
  return (Number.isFinite(seconds) && seconds > 0 ? seconds : DEFAULT_SHUTDOWN_TIMEOUT_SECS) * 1000;
}

/**
 * Serve on HOST:PORT until SIGTERM/SIGINT, then stop accepting connections,
 * let in-flight requests finish, and exit (forced after SHUTDOWN_TIMEOUT_SECS,
 * or at once on a second signal).
 */
export function startRuntimeServer(): Server {
  // Backstop for rejections raised outside any request's promise chain, most
  // often by a dependency that starts work without awaiting it. Node's default
  // is to exit, which drops every in-flight request over one bad one; log
  // instead and keep serving.
  process.on("unhandledRejection", (reason) => {
    console.error("[EXA-MCP] Unhandled promise rejection:", reason);
  });

  const host = process.env.HOST || "0.0.0.0";
  const port = Number(process.env.PORT || 8000);
  const server = createRuntimeServer();
  server.listen(port, host, () => {
    console.log(`[EXA-MCP] AgentCore Runtime server listening on http://${host}:${port}`);
  });

  const timeoutMs = shutdownTimeoutMs();
  let shuttingDown = false;
  const shutdown = (signal: NodeJS.Signals): void => {
    if (shuttingDown) {
      console.log(`[EXA-MCP] Received ${signal} again, exiting without waiting for the drain`);
      process.exit(0);
    }
    shuttingDown = true;
    console.log(`[EXA-MCP] Received ${signal}, shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), timeoutMs).unref();
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  return server;
}
