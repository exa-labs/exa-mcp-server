import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { DELETE, GET, OPTIONS, POST } from "../api/mcp.js";

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 8000);

type Handler = (request: Request) => Promise<Response> | Response;

async function toRequest(request: IncomingMessage, body: Buffer): Promise<Request> {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) {
      headers.set(name, value.join(", "));
    } else if (value !== undefined) {
      headers.set(name, value);
    }
  }

  return new Request(`http://${HOST}:${PORT}${request.url || "/"}`, {
    method: request.method,
    headers,
    body:
      request.method === "GET" || request.method === "HEAD" || body.length === 0
        ? undefined
        : body.toString(),
  });
}

async function readBody(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function writeResponse(response: Response, target: ServerResponse): Promise<void> {
  target.statusCode = response.status;
  target.statusMessage = response.statusText;
  response.headers.forEach((value, key) => target.setHeader(key, value));

  if (!response.body) {
    target.end();
    return;
  }

  await new Promise<void>((resolve, reject) => {
    Readable.fromWeb(response.body as import("node:stream/web").ReadableStream)
      .on("error", reject)
      .pipe(target)
      .on("finish", resolve)
      .on("error", reject);
  });
}

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

const server = createServer(async (request, response) => {
  try {
    if (request.method === "GET" && request.url?.split("?")[0] === "/ping") {
      response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("ok\n");
      return;
    }

    const handler = handlerForMethod(request.method);
    if (!handler) {
      response.writeHead(405, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }

    const webRequest = await toRequest(request, await readBody(request));
    await writeResponse(await handler(webRequest), response);
  } catch (error) {
    console.error("[EXA-MCP] Runtime request failed:", error);
    if (!response.headersSent) {
      response.writeHead(500, { "Content-Type": "application/json" });
    }
    response.end(JSON.stringify({ error: "Internal server error" }));
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[EXA-MCP] AgentCore Runtime server listening on http://${HOST}:${PORT}`);
});
