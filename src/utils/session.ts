import { getRedisClient } from './redis.js';

const SESSION_PREFIX = 'exa-mcp:session:';
const SESSION_TTL_SECONDS = 86400; // 24 hours

/**
 * Generates a random session token using crypto-safe randomness where available,
 * falling back to Math.random for environments without crypto.
 */
function generateToken(): string {
  const segments = [
    randomHex(8),
    randomHex(4),
    randomHex(4),
    randomHex(4),
    randomHex(12),
  ];
  return `mcp_sess_${segments.join('-')}`;
}

function randomHex(length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 16).toString(16);
  }
  return result;
}

/**                                                                                                                                                                                                                                    
 * Stores a session_token -> api_key mapping in Redis with a 24-hour TTL.                                                                                                                                                              
 * Returns the generated session token.                                                                                                                                                                                                
 */                                                       
export async function createSessionToken(apiKey: string): Promise<string> {
  const redis = getRedisClient();
  if (!redis) {
    throw new Error('Redis not configured — cannot create session token');
  }

  const token = generateToken();
  await redis.set(`${SESSION_PREFIX}${token}`, apiKey, { ex: SESSION_TTL_SECONDS });
  return token;
}

/**
 * Looks up the API key for a session token. Returns null if the token is
 * expired, invalid, or Redis is not configured.
 */
export async function resolveSessionToken(token: string): Promise<string | null> {
  const redis = getRedisClient();
  if (!redis) return null;

  const apiKey = await redis.get<string>(`${SESSION_PREFIX}${token}`);
  return apiKey ?? null;
}

/**
 * Resolves the API key to use for a tool call.
 *
 * Priority:
 *   1. Valid session token (from OTP auth flow)
 *   2. Config API key (from URL param or env var)
 *   3. EXA_API_KEY environment variable
 *   4. Empty string (will fail at the Exa API)
 */
export async function resolveApiKey(
  sessionToken: string | undefined,
  configApiKey: string | undefined,
): Promise<string> {
  if (sessionToken) {
    const resolved = await resolveSessionToken(sessionToken);
    if (resolved) return resolved;
  }
  return configApiKey || process.env.EXA_API_KEY || '';
}
