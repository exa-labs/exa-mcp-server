/**
 * OAuth Protected Resource Metadata (RFC 9728)
 *
 * Tells MCP clients where to find the authorization server
 * for this resource server (mcp.exa.ai).
 */

const OAUTH_ISSUER = process.env.OAUTH_ISSUER || 'https://auth.exa.ai';

/**
 * The only resource that participates in OAuth.
 *
 * OAuth is strictly opt-in via the dedicated `/mcp/oauth` endpoint. The default
 * `/mcp` resource is API-key / free-tier only and must NOT be advertised as
 * OAuth-protected: OAuth-capable MCP clients (Claude, Cursor, VS Code, ChatGPT
 * connectors) probe this endpoint (RFC 9728) as soon as a server URL is added —
 * before sending any MCP request and without carrying the `?exaApiKey=` query
 * param or `x-api-key`/`Authorization` header — so advertising OAuth for `/mcp`
 * makes them launch an OAuth flow even when the user embedded an API key in the
 * URL or a header. Only the `mcp/oauth` resource is advertised, so a client
 * pointed at `/mcp` discovers no authorization server and falls straight through
 * to the API key / free tier.
 */
const OAUTH_RESOURCE_PATH = 'mcp/oauth';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Resolve which resource this metadata request is for.
 *
 * RFC 9728 clients request /.well-known/oauth-protected-resource/<resource path>
 * and require the returned `resource` to exactly match the URL they connected to.
 * The vercel.json rewrite passes that path suffix along as ?path=..., so echo it
 * back — but only for the OAuth-enabled resource; every other path (including the
 * default /mcp resource and the bare, path-less request) resolves to null so the
 * endpoint 404s instead of advertising OAuth.
 */
function resolveResource(request: Request): string | null {
  const path = new URL(request.url).searchParams.get('path');
  return path === OAUTH_RESOURCE_PATH ? `https://mcp.exa.ai/${path}` : null;
}

export function GET(request: Request): Response {
  const resource = resolveResource(request);
  if (!resource) {
    // Not an OAuth-protected resource — 404 so clients fall back to the API key
    // / free tier instead of initiating an OAuth flow.
    return new Response(null, {
      status: 404,
      headers: {
        ...CORS_HEADERS,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  const metadata = {
    resource,
    authorization_servers: [OAUTH_ISSUER],
    scopes_supported: ['mcp:tools'],
    bearer_methods_supported: ['header'],
  };

  return new Response(JSON.stringify(metadata, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

export function OPTIONS(): Response {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
