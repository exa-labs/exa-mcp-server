/**
 * OAuth Protected Resource Metadata (RFC 9728)
 * 
 * Tells MCP clients where to find the authorization server
 * for this resource server (mcp.exa.ai).
 */

const OAUTH_ISSUER = process.env.OAUTH_ISSUER || 'https://auth.exa.ai';

/**
 * Resolve which resource this metadata request is for.
 *
 * RFC 9728 clients request /.well-known/oauth-protected-resource/<resource path>
 * and require the returned `resource` to exactly match the URL they connected to.
 * The vercel.json rewrite passes that path suffix along as ?path=..., so echo it
 * back; requests without a path describe the default /mcp resource.
 */
function resolveResource(request: Request): string {
  const path = new URL(request.url).searchParams.get('path');
  return path ? `https://mcp.exa.ai/${path}` : 'https://mcp.exa.ai/mcp';
}

export function GET(request: Request): Response {
  const metadata = {
    resource: resolveResource(request),
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
