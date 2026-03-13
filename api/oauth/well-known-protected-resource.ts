import { generateProtectedResourceMetadata } from 'mcp-handler';
import { getBaseUrl } from '../../src/auth/oauth.js';

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'public, max-age=3600',
  };
}

function handler(request: Request): Response {
  const baseUrl = getBaseUrl(request.url);

  const metadata = generateProtectedResourceMetadata({
    authServerUrls: [baseUrl],
    resourceUrl: `${baseUrl}/mcp`,
    additionalMetadata: {
      scopes_supported: [],
      resource_name: 'Exa MCP Server',
      resource_documentation: 'https://docs.exa.ai',
    },
  });

  return new Response(JSON.stringify(metadata, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

function options(): Response {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export { handler as GET, options as OPTIONS };
