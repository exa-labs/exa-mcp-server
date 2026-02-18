import { Redis } from '@upstash/redis';

let client: Redis | null = null;
let initialized = false;

/**
 * Returns a shared Upstash Redis client, or null if credentials are not configured.
 * The client is created once and reused across all callers within the same process.
 */
export function getRedisClient(): Redis | null {
  if (initialized) return client;
  initialized = true;

  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  try {
    client = new Redis({ url, token });
  } catch (error) {
    console.error('[EXA-MCP] Failed to create Redis client:', error);
  }

  return client;
}
