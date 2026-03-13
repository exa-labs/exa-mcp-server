import crypto from 'node:crypto';
import { storeClient, isOAuthConfigured } from '../../src/auth/oauth.js';

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

async function handlePOST(request: Request): Promise<Response> {
  if (!isOAuthConfigured()) {
    return jsonResponse({ error: 'server_error', error_description: 'OAuth is not configured on this server' }, 501);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: 'invalid_client_metadata', error_description: 'Invalid JSON body' }, 400);
  }

  const redirectUris = body.redirect_uris;
  if (!Array.isArray(redirectUris) || redirectUris.length === 0) {
    return jsonResponse({ error: 'invalid_client_metadata', error_description: 'redirect_uris is required and must be a non-empty array' }, 400);
  }

  const clientId = crypto.randomUUID();
  const clientData = {
    client_id: clientId,
    redirect_uris: redirectUris as string[],
    client_name: (body.client_name as string) || undefined,
    client_uri: (body.client_uri as string) || undefined,
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none' as const,
  };

  await storeClient(clientId, clientData);

  return jsonResponse({
    ...clientData,
    client_id_issued_at: Math.floor(Date.now() / 1000),
  }, 201);
}

async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (request.method === 'POST') return handlePOST(request);
  return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST, OPTIONS', ...corsHeaders() } });
}

export { handler as POST, handler as OPTIONS };
