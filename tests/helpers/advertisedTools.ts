import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

/**
 * An MCP client connected in memory to a real McpServer set up by `register`,
 * so requests pass through the SDK's own schema conversion and validation.
 * Close the client when done.
 */
export async function connectInMemory(register: (server: McpServer) => void): Promise<Client> {
  const server = new McpServer({ name: "exa-mcp-test", version: "0.0.0" });
  register(server);
  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "exa-mcp-test-client", version: "0.0.0" });
  await client.connect(clientTransport);
  return client;
}

/**
 * The tools a real McpServer advertises on `tools/list` after `register` runs,
 * with input/output schemas converted to JSON Schema exactly as clients see
 * them.
 */
export async function listAdvertisedTools(register: (server: McpServer) => void): Promise<Tool[]> {
  const client = await connectInMemory(register);
  try {
    return (await client.listTools()).tools;
  } finally {
    await client.close();
  }
}

/** Every `pattern` string in a JSON Schema, keyed by its JSON path. */
export function collectPatterns(schema: unknown, path = "$"): Array<[string, string]> {
  if (schema === null || typeof schema !== "object") return [];
  return Object.entries(schema).flatMap(([key, value]) =>
    key === "pattern" && typeof value === "string"
      ? [[`${path}.pattern`, value] as [string, string]]
      : collectPatterns(value, `${path}.${key}`),
  );
}
