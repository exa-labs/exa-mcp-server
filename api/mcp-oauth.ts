/**
 * OAuth-gated MCP endpoint at /mcp-oauth.
 *
 * Identical to /mcp but returns 401 with WWW-Authenticate when no
 * authentication is provided, which triggers the MCP OAuth flow in
 * clients like Cursor. Users who already have an API key can still
 * pass it via Bearer header or ?exaApiKey= query parameter.
 *
 * The free-tier /mcp endpoint remains unchanged.
 */

import { handleRequest, getBearerToken } from './mcp.js';

function hasAuth(request: Request): boolean {
  if (getBearerToken(request)) return true;

  try {
    const url = new URL(request.url);
    if (url.searchParams.get('exaApiKey')) return true;
  } catch {
    // URL parsing failed — no auth
  }

  return false;
}

function create401Response(): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Authentication required. Use OAuth or provide an API key.',
      },
      id: null,
    }),
    {
      status: 401,
      headers: {
        'WWW-Authenticate':
          'Bearer resource_metadata="https://mcp.exa.ai/.well-known/oauth-protected-resource"',
        'Content-Type': 'application/json',
      },
    },
  );
}

async function handleOAuthRequest(request: Request): Promise<Response> {
  if (!hasAuth(request)) {
    return create401Response();
  }
  return handleRequest(request);
}

export { handleOAuthRequest as GET, handleOAuthRequest as POST, handleOAuthRequest as DELETE };
