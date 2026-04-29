/**
 * In-memory MCP test harness.
 *
 * Wraps `InMemoryTransport.createLinkedPair()` from the official SDK to drive
 * the real `initializeMcpServer()` end-to-end without spawning a child process
 * or framing JSON-RPC over stdio.
 *
 * Pattern adapted from the canonical example at
 * https://github.com/mkusaka/mcp-server-e2e-testing-example (sdk.spec.ts).
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { initializeMcpServer, type McpConfig } from "../../src/mcp-handler.js";

export interface TestServer {
  client: Client;
  server: McpServer;
  cleanup: () => Promise<void>;
}

export async function buildTestServer(config: McpConfig = {}): Promise<TestServer> {
  const server = new McpServer({
    name: "exa-search-server-test",
    title: "Exa (test)",
    version: "0.0.0-test",
  });
  initializeMcpServer(server, config);

  const client = new Client({ name: "test-client", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await Promise.all([
    server.server.connect(serverTransport),
    client.connect(clientTransport),
  ]);

  const cleanup = async (): Promise<void> => {
    await Promise.allSettled([server.server.close(), client.close()]);
  };

  return { client, server, cleanup };
}
