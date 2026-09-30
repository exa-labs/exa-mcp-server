/**
 * The `?exaApiKey=` + Bearer JWT connector shape through the served MCP
 * endpoint (what an OAuth-discovering client sends once an admin has put the
 * org's key in the connector URL):
 *
 * - a working URL key answers on its own; the JWT is never verified;
 * - a URL key the Exa API rejects makes the server verify the JWT and run the
 *   same tool call again on it;
 * - a URL key the Exa API rejects with no usable JWT stays a tool error.
 *
 * The authorization server is a local issuer: `OAUTH_ISSUER` points the
 * server's JWKS fetch at a keypair this file generates, so the JWT it mints
 * verifies exactly as an auth.exa.ai token does.
 */
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import * as jose from "jose";
import {
  connectMcpClient,
  FakeExaApi,
  searchResults,
  startInProcessServer,
  type ServedMcp,
} from "./harness.js";

const AUDIENCE = "https://mcp.exa.ai";
const ORG_KEY = "org-url-key";
const REVOKED_ORG_KEY = "revoked-org-url-key";

let exaApi: FakeExaApi;
let issuer: Server;
let issuerUrl: string;
let signingKey: CryptoKey;
let served: ServedMcp;
const clients: Client[] = [];

beforeAll(async () => {
  exaApi = await FakeExaApi.start();

  const { publicKey, privateKey } = await jose.generateKeyPair("RS256");
  signingKey = privateKey;
  const jwk = { ...(await jose.exportJWK(publicKey)), kid: "integration", alg: "RS256" };
  issuer = createServer((req, res) => {
    if (req.url === "/api/oauth/jwks") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ keys: [jwk] }));
      return;
    }
    res.writeHead(404);
    res.end();
  });
  await new Promise<void>((resolve) => issuer.listen(0, "127.0.0.1", resolve));
  issuerUrl = `http://127.0.0.1:${(issuer.address() as AddressInfo).port}`;

  served = await startInProcessServer({
    EXA_API_BASE_URL: exaApi.url,
    EXA_API_KEY: "",
    OAUTH_ISSUER: issuerUrl,
    OAUTH_AUDIENCE: AUDIENCE,
  });
});

afterAll(async () => {
  await Promise.all(clients.map((client) => client.close()));
  await exaApi.close();
  await new Promise<void>((resolve) => issuer.close(() => resolve()));
});

beforeEach(() => {
  // The Exa API double: the org's live key and the OAuth identity's Bearer
  // token both search; the revoked key is rejected the way api.exa.ai does.
  exaApi.respondWith((call) => {
    const apiKey = call.headers["x-api-key"];
    const authorization = call.headers["authorization"];
    if (apiKey === ORG_KEY || (authorization ?? "").startsWith("Bearer ey")) {
      return { status: 200, body: searchResults("https://exa.ai/") };
    }
    return { status: 401, body: { error: "Invalid API key" } };
  });
});

/** A JWT the server accepts as an Exa OAuth access token for `sub`, valid until `expiresIn`. */
async function accessToken(sub: string, expiresIn = "5m"): Promise<string> {
  return new jose.SignJWT({ "exa:team_id": "team-oauth", scope: "mcp:tools" })
    .setProtectedHeader({ alg: "RS256", kid: "integration" })
    .setIssuer(issuerUrl)
    .setAudience(AUDIENCE)
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(signingKey);
}

async function connectorClient(urlKey: string, jwt: string | undefined): Promise<Client> {
  const headers: Record<string, string> = jwt ? { Authorization: `Bearer ${jwt}` } : {};
  const connected = await connectMcpClient(served, headers, { exaApiKey: urlKey });
  clients.push(connected);
  return connected;
}

async function search(mcp: Client) {
  return mcp.callTool({ name: "web_search_exa", arguments: { query: "exa" } });
}

describe("?exaApiKey= alongside a Bearer JWT", () => {
  it("searches on a working URL key and never touches the JWT", async () => {
    const mcp = await connectorClient(ORG_KEY, await accessToken("user-1"));

    const result = await search(mcp);

    expect(result.isError).toBeFalsy();
    const calls = exaApi.callsTo("/search");
    expect(calls).toHaveLength(1);
    expect(calls[0].headers["x-api-key"]).toBe(ORG_KEY);
    expect(calls[0].headers["authorization"]).toBeUndefined();
  });

  it("retries a search on the JWT when the URL key is rejected upstream", async () => {
    const jwt = await accessToken("user-2");
    const mcp = await connectorClient(REVOKED_ORG_KEY, jwt);

    const result = await search(mcp);

    expect(result.isError).toBeFalsy();
    const calls = exaApi.callsTo("/search");
    expect(calls).toHaveLength(2);
    expect(calls[0].headers["x-api-key"]).toBe(REVOKED_ORG_KEY);
    expect(calls[0].headers["authorization"]).toBeUndefined();
    expect(calls[1].headers["authorization"]).toBe(`Bearer ${jwt}`);
    expect(calls[1].headers["x-api-key"]).toBeUndefined();
    expect(calls[1].body).toEqual(calls[0].body);
  });

  it("keeps the rejection when the JWT alongside the rejected key is expired", async () => {
    const jwt = await accessToken("user-3", "-5m");
    const mcp = await connectorClient(REVOKED_ORG_KEY, jwt);

    const result = await search(mcp);

    expect(result.isError).toBe(true);
    expect(exaApi.callsTo("/search")).toHaveLength(1);
  });

  it("keeps the rejection when the URL key is the only credential", async () => {
    const mcp = await connectorClient(REVOKED_ORG_KEY, undefined);

    const result = await search(mcp);

    expect(result.isError).toBe(true);
    expect(exaApi.callsTo("/search")).toHaveLength(1);
  });
});
