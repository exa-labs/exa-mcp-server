import crypto from 'node:crypto';
import { Redis } from '@upstash/redis';

// --- Constants ---
const TOKEN_VERSION = 1;
const ACCESS_TOKEN_TTL = 3600; // 1 hour
const AUTH_CODE_TTL = 600; // 10 minutes
const CLIENT_TTL = 2592000; // 30 days

// --- Types ---

export interface AuthCodeData {
  apiKey: string;
  codeChallenge: string;
  redirectUri: string;
  clientId: string;
}

export interface ClientData {
  client_id: string;
  redirect_uris: string[];
  client_name?: string;
  client_uri?: string;
  grant_types: string[];
  response_types: string[];
  token_endpoint_auth_method: string;
}

// --- Redis (lazy singleton) ---

let _redis: Redis | null = null;
let _redisInitialized = false;

function getRedis(): Redis | null {
  if (_redisInitialized) return _redis;
  _redisInitialized = true;

  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  _redis = new Redis({ url, token });
  return _redis;
}

// --- Encryption ---

function getEncryptionKey(): Buffer {
  const secret = process.env.OAUTH_SECRET;
  if (!secret) throw new Error('OAUTH_SECRET environment variable is not configured');
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts a JSON payload into a base64url token using AES-256-GCM.
 * Token format: version(1) + iv(12) + authTag(16) + ciphertext(variable)
 */
export function encryptToken(payload: Record<string, unknown>): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = JSON.stringify(payload);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const token = Buffer.concat([Buffer.from([TOKEN_VERSION]), iv, authTag, encrypted]);
  return token.toString('base64url');
}

/**
 * Decrypts a base64url token back into the original JSON payload.
 * Returns null if decryption fails or token format is invalid.
 */
export function decryptToken(token: string): Record<string, unknown> | null {
  try {
    const key = getEncryptionKey();
    const buf = Buffer.from(token, 'base64url');
    if (buf.length < 30) return null; // minimum: 1 + 12 + 16 + 1
    const version = buf[0];
    if (version !== TOKEN_VERSION) return null;
    const iv = buf.subarray(1, 13);
    const authTag = buf.subarray(13, 29);
    const encrypted = buf.subarray(29);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
  } catch {
    return null;
  }
}

// --- Token Creation & Verification ---

export function createAccessToken(apiKey: string): { token: string; expiresIn: number } {
  const exp = Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL;
  const token = encryptToken({ key: apiKey, exp, type: 'access' });
  return { token, expiresIn: ACCESS_TOKEN_TTL };
}

export function createRefreshToken(apiKey: string): string {
  return encryptToken({ key: apiKey, type: 'refresh' });
}

export function verifyAccessToken(token: string): { apiKey: string } | null {
  const payload = decryptToken(token);
  if (!payload) return null;
  if (payload.type !== 'access') return null;
  if (typeof payload.exp === 'number' && payload.exp < Math.floor(Date.now() / 1000)) return null;
  if (typeof payload.key !== 'string') return null;
  return { apiKey: payload.key };
}

export function verifyRefreshToken(token: string): { apiKey: string } | null {
  const payload = decryptToken(token);
  if (!payload) return null;
  if (payload.type !== 'refresh') return null;
  if (typeof payload.key !== 'string') return null;
  return { apiKey: payload.key };
}

// --- PKCE ---

export function verifyPKCE(codeVerifier: string, codeChallenge: string): boolean {
  const computed = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  return computed === codeChallenge;
}

// --- Auth Code Management (Redis-backed) ---

export async function storeAuthCode(code: string, data: AuthCodeData): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  await redis.set(`oauth:code:${code}`, JSON.stringify(data), { ex: AUTH_CODE_TTL });
  return true;
}

export async function getAndDeleteAuthCode(code: string): Promise<AuthCodeData | null> {
  const redis = getRedis();
  if (!redis) return null;
  const raw = await redis.get<string>(`oauth:code:${code}`);
  if (!raw) return null;
  await redis.del(`oauth:code:${code}`);
  return typeof raw === 'string' ? JSON.parse(raw) as AuthCodeData : raw as AuthCodeData;
}

// --- Client Registration (Redis-backed) ---

export async function storeClient(clientId: string, data: ClientData): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  await redis.set(`oauth:client:${clientId}`, JSON.stringify(data), { ex: CLIENT_TTL });
  return true;
}

export async function getClient(clientId: string): Promise<ClientData | null> {
  const redis = getRedis();
  if (!redis) return null;
  const raw = await redis.get<string>(`oauth:client:${clientId}`);
  if (!raw) return null;
  return typeof raw === 'string' ? JSON.parse(raw) as ClientData : raw as ClientData;
}

// --- Utilities ---

export function generateRandomCode(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function getBaseUrl(requestUrl: string): string {
  if (process.env.MCP_BASE_URL) return process.env.MCP_BASE_URL.replace(/\/$/, '');
  const url = new URL(requestUrl);
  return `${url.protocol}//${url.host}`;
}

// --- OAuth Metadata ---

export function generateAuthServerMetadata(baseUrl: string): Record<string, unknown> {
  return {
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/authorize`,
    token_endpoint: `${baseUrl}/token`,
    registration_endpoint: `${baseUrl}/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['none'],
    code_challenge_methods_supported: ['S256'],
    scopes_supported: [],
    service_documentation: 'https://docs.exa.ai',
  };
}

export function isOAuthConfigured(): boolean {
  return typeof process.env.OAUTH_SECRET === 'string' && process.env.OAUTH_SECRET.length > 0;
}
