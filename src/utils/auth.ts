import * as jose from 'jose';

const OAUTH_ISSUER = process.env.OAUTH_ISSUER || 'https://auth.exa.ai';
const OAUTH_AUDIENCE = process.env.OAUTH_AUDIENCE || 'https://mcp.exa.ai';
const JWKS_URI = `${OAUTH_ISSUER}/api/oauth/jwks`;

/** Cached JWKS fetcher — jose handles caching + rotation internally. */
let jwks: ReturnType<typeof jose.createRemoteJWKSet> | null = null;

function getJwks() {
  if (!jwks) {
    jwks = jose.createRemoteJWKSet(new URL(JWKS_URI));
  }
  return jwks;
}

/** Check if a token looks like a JWT (3 dot-separated base64url segments). */
export function isJwtToken(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const base64urlRegex = /^[A-Za-z0-9_-]+$/;
  return parts.every(part => part.length > 0 && base64urlRegex.test(part));
}

export interface OAuthTokenClaims {
  sub: string;
  'exa:team_id': string;
  'exa:api_key_id': string;
  scope?: string;
}

/**
 * Verify an OAuth JWT access token from the Exa authorization server.
 * Returns the validated claims or null if verification fails.
 */
export async function verifyOAuthToken(token: string): Promise<OAuthTokenClaims | null> {
  try {
    const { payload } = await jose.jwtVerify(token, getJwks(), {
      issuer: OAUTH_ISSUER,
      audience: OAUTH_AUDIENCE,
    });

    const teamId = payload['exa:team_id'];
    const apiKeyId = payload['exa:api_key_id'];

    if (typeof teamId !== 'string' || typeof apiKeyId !== 'string') {
      console.error('[EXA-MCP] JWT missing required exa claims');
      return null;
    }

    return {
      sub: payload.sub ?? '',
      'exa:team_id': teamId,
      'exa:api_key_id': apiKeyId,
      scope: typeof payload.scope === 'string' ? payload.scope : undefined,
    };
  } catch (error) {
    console.error('[EXA-MCP] JWT verification failed:', error instanceof Error ? error.message : error);
    return null;
  }
}
