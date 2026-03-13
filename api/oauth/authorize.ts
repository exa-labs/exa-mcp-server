import { storeAuthCode, generateRandomCode, isOAuthConfigured } from '../../src/auth/oauth.js';

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function authorizePage(
  clientId: string,
  redirectUri: string,
  state: string,
  codeChallenge: string,
  error?: string
): string {
  return `<!DOCTYPE html>
<html lang="en"><head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Connect to Exa</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .card { background: #161616; border: 1px solid #262626; border-radius: 16px; padding: 40px; max-width: 420px; width: 100%; }
    .logo { font-size: 28px; font-weight: 700; margin-bottom: 6px; }
    .subtitle { color: #888; font-size: 14px; line-height: 1.5; margin-bottom: 28px; }
    label { display: block; font-size: 13px; font-weight: 500; color: #aaa; margin-bottom: 6px; }
    input[type="password"] { width: 100%; padding: 10px 14px; border: 1px solid #333; border-radius: 8px; background: #0a0a0a; color: #fff; font-size: 14px; outline: none; transition: border-color 0.15s; }
    input[type="password"]:focus { border-color: #4a9eff; }
    .error { color: #ef4444; font-size: 13px; margin-top: 8px; }
    .btn { width: 100%; padding: 11px; border: none; border-radius: 8px; background: #4a9eff; color: #fff; font-size: 15px; font-weight: 600; cursor: pointer; margin-top: 20px; transition: background 0.15s; }
    .btn:hover { background: #3b8de8; }
    .footer { margin-top: 18px; text-align: center; }
    .link { color: #4a9eff; text-decoration: none; font-size: 13px; }
    .link:hover { text-decoration: underline; }
  </style>
</head><body>
  <div class="card">
    <div class="logo">Exa</div>
    <p class="subtitle">Enter your API key to connect this application to Exa.</p>
    <form method="POST">
      <input type="hidden" name="client_id" value="${escapeHtml(clientId)}">
      <input type="hidden" name="redirect_uri" value="${escapeHtml(redirectUri)}">
      <input type="hidden" name="state" value="${escapeHtml(state)}">
      <input type="hidden" name="code_challenge" value="${escapeHtml(codeChallenge)}">
      <label for="api_key">Exa API Key</label>
      <input type="password" id="api_key" name="api_key" placeholder="your-exa-api-key" required autocomplete="off">
      ${error ? `<div class="error">${escapeHtml(error)}</div>` : ''}
      <button type="submit" class="btn">Connect</button>
    </form>
    <div class="footer">
      <a href="https://dashboard.exa.ai/api-keys" target="_blank" rel="noopener" class="link">Get an API key &rarr;</a>
    </div>
  </div>
</body></html>`;
}

async function handleGET(request: Request): Promise<Response> {
  if (!isOAuthConfigured()) {
    return new Response('OAuth is not configured on this server', { status: 501, headers: corsHeaders() });
  }

  const url = new URL(request.url);
  const clientId = url.searchParams.get('client_id') || '';
  const redirectUri = url.searchParams.get('redirect_uri') || '';
  const state = url.searchParams.get('state') || '';
  const codeChallenge = url.searchParams.get('code_challenge') || '';
  const codeChallengeMethod = url.searchParams.get('code_challenge_method') || '';

  if (!clientId || !redirectUri || !codeChallenge) {
    return new Response('Missing required parameters: client_id, redirect_uri, code_challenge', {
      status: 400,
      headers: corsHeaders(),
    });
  }

  if (codeChallengeMethod && codeChallengeMethod !== 'S256') {
    return new Response('Only S256 code_challenge_method is supported', { status: 400, headers: corsHeaders() });
  }

  return new Response(authorizePage(clientId, redirectUri, state, codeChallenge), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders() },
  });
}

async function handlePOST(request: Request): Promise<Response> {
  if (!isOAuthConfigured()) {
    return new Response('OAuth is not configured on this server', { status: 501, headers: corsHeaders() });
  }

  const formData = await request.formData();
  const clientId = (formData.get('client_id') as string) || '';
  const redirectUri = (formData.get('redirect_uri') as string) || '';
  const state = (formData.get('state') as string) || '';
  const codeChallenge = (formData.get('code_challenge') as string) || '';
  const apiKey = (formData.get('api_key') as string) || '';

  if (!clientId || !redirectUri || !codeChallenge || !apiKey) {
    return new Response(
      authorizePage(clientId, redirectUri, state, codeChallenge, 'Please enter your API key.'),
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders() } },
    );
  }

  const code = generateRandomCode();
  const stored = await storeAuthCode(code, { apiKey, codeChallenge, redirectUri, clientId });

  if (!stored) {
    return new Response(
      authorizePage(clientId, redirectUri, state, codeChallenge, 'Server configuration error. Redis may not be configured.'),
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders() } },
    );
  }

  const redirectUrl = new URL(redirectUri);
  redirectUrl.searchParams.set('code', code);
  if (state) redirectUrl.searchParams.set('state', state);

  return Response.redirect(redirectUrl.toString(), 302);
}

async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (request.method === 'GET') return handleGET(request);
  if (request.method === 'POST') return handlePOST(request);
  return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, POST, OPTIONS', ...corsHeaders() } });
}

export { handler as GET, handler as POST, handler as OPTIONS };
