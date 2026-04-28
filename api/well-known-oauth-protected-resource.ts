/**
 * OAuth Protected Resource Metadata (RFC 9728)
 * 
 * Tells MCP clients where to find the authorization server
 * for this resource server (mcp.exa.ai).
 */

const OAUTH_ISSUER = process.env.OAUTH_ISSUER || 'https://auth.exa.ai';

export function GET(): Response {
  const metadata = {
    resource: 'https://mcp.exa.ai',
    authorization_servers: [OAUTH_ISSUER],
    scopes_supported: ['mcp:tools'],
    bearer_methods_supported: ['header'],
  };

  return new Response(JSON.stringify(metadata, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

export function OPTIONS(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
