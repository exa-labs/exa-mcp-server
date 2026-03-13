import { generateAuthServerMetadata, getBaseUrl } from '../../src/auth/oauth.js';

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, max-age=3600',
  };
}

function handler(request: Request): Response {
  const baseUrl = getBaseUrl(request.url);
  const metadata = generateAuthServerMetadata(baseUrl);

  return new Response(JSON.stringify(metadata, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

function options(): Response {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export { handler as GET, options as OPTIONS };
