import {
  getAndDeleteAuthCode,
  verifyPKCE,
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
  isOAuthConfigured,
} from '../../src/auth/oauth.js';

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
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...corsHeaders() },
  });
}

function errorResponse(error: string, description: string, status = 400): Response {
  return jsonResponse({ error, error_description: description }, status);
}

async function parseParams(request: Request): Promise<URLSearchParams> {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const body = await request.json() as Record<string, string>;
    return new URLSearchParams(body);
  }
  return new URLSearchParams(await request.text());
}

async function handleAuthorizationCode(params: URLSearchParams): Promise<Response> {
  const code = params.get('code');
  const codeVerifier = params.get('code_verifier');
  const redirectUri = params.get('redirect_uri');
  const clientId = params.get('client_id');

  if (!code || !codeVerifier || !clientId) {
    return errorResponse('invalid_request', 'Missing required parameters: code, code_verifier, client_id');
  }

  const codeData = await getAndDeleteAuthCode(code);
  if (!codeData) {
    return errorResponse('invalid_grant', 'Authorization code is invalid or expired');
  }

  if (codeData.clientId !== clientId) {
    return errorResponse('invalid_grant', 'client_id mismatch');
  }

  if (redirectUri && codeData.redirectUri !== redirectUri) {
    return errorResponse('invalid_grant', 'redirect_uri mismatch');
  }

  if (!verifyPKCE(codeVerifier, codeData.codeChallenge)) {
    return errorResponse('invalid_grant', 'PKCE verification failed');
  }

  const { token: accessToken, expiresIn } = createAccessToken(codeData.apiKey);
  const refreshToken = createRefreshToken(codeData.apiKey);

  return jsonResponse({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: expiresIn,
    refresh_token: refreshToken,
  });
}

async function handleRefreshToken(params: URLSearchParams): Promise<Response> {
  const refreshToken = params.get('refresh_token');
  if (!refreshToken) {
    return errorResponse('invalid_request', 'Missing refresh_token');
  }

  const result = verifyRefreshToken(refreshToken);
  if (!result) {
    return errorResponse('invalid_grant', 'Refresh token is invalid');
  }

  const { token: accessToken, expiresIn } = createAccessToken(result.apiKey);
  const newRefreshToken = createRefreshToken(result.apiKey);

  return jsonResponse({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: expiresIn,
    refresh_token: newRefreshToken,
  });
}

async function handlePOST(request: Request): Promise<Response> {
  if (!isOAuthConfigured()) {
    return errorResponse('server_error', 'OAuth is not configured on this server', 501);
  }

  const params = await parseParams(request);
  const grantType = params.get('grant_type');

  if (grantType === 'authorization_code') {
    return handleAuthorizationCode(params);
  }
  if (grantType === 'refresh_token') {
    return handleRefreshToken(params);
  }
  return errorResponse('unsupported_grant_type', 'Only authorization_code and refresh_token are supported');
}

async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (request.method === 'POST') return handlePOST(request);
  return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST, OPTIONS', ...corsHeaders() } });
}

export { handler as POST, handler as OPTIONS };
