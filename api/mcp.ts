process.env.AGNOST_LOG_LEVEL = 'error';

import { createMcpHandler } from 'mcp-handler';
import { initializeMcpServer } from '../src/mcp-handler.js';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { isJwtToken, verifyOAuthToken } from '../src/utils/auth.js';

/**
 * IP-based rate limiting configuration for free MCP users.
 * Users who provide their own API key via ?exaApiKey= bypass rate limiting.
 * 
 * Rate limiting only applies to actual tool calls (tools/call method), not to
 * basic MCP protocol methods like tools/list, initialize, ping, etc.
 * 
 * Environment variables (supports both Vercel KV and Upstash naming):
 * - KV_REST_API_URL or UPSTASH_REDIS_REST_URL: Redis connection URL
 * - KV_REST_API_TOKEN or UPSTASH_REDIS_REST_TOKEN: Redis auth token
 * - RATE_LIMIT_QPS: Queries per second limit (default: 2)
 * - RATE_LIMIT_DAILY: Daily request quota (default: 50)
 */

// Lazy-initialize rate limiters only when Upstash is configured
let qpsLimiter: Ratelimit | null = null;
let dailyLimiter: Ratelimit | null = null;
let rateLimitersInitialized = false;
let redisClient: Redis | null = null;

function initializeRateLimiters(): boolean {
  if (rateLimitersInitialized) {
    return qpsLimiter !== null;
  }
  
  rateLimitersInitialized = true;
  
  // Support both Vercel KV naming (KV_REST_API_*) and Upstash naming (UPSTASH_REDIS_REST_*)
  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (!redisUrl || !redisToken) {
    console.log('[EXA-MCP] Rate limiting disabled: KV_REST_API_URL/UPSTASH_REDIS_REST_URL or KV_REST_API_TOKEN/UPSTASH_REDIS_REST_TOKEN not configured');
    return false;
  }
  
  try {
    redisClient = new Redis({
      url: redisUrl,
      token: redisToken,
    });
    
    const qpsLimit = parseInt(process.env.RATE_LIMIT_QPS || '2', 10);
    const dailyLimit = parseInt(process.env.RATE_LIMIT_DAILY || '50', 10);
    
    // QPS limiter: sliding window for smooth rate limiting
    qpsLimiter = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(qpsLimit, '1 s'),
      prefix: 'exa-mcp:qps',
    });
    
    // Daily limiter: fixed window that resets daily
    dailyLimiter = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.fixedWindow(dailyLimit, '1 d'),
      prefix: 'exa-mcp:daily',
    });
    
    console.log(`[EXA-MCP] Rate limiting enabled: ${qpsLimit} QPS, ${dailyLimit}/day`);
    return true;
  } catch (error) {
    console.error('[EXA-MCP] Failed to initialize rate limiters:', error);
    return false;
  }
}

function getClientIp(request: Request): string {
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  const xRealIp = request.headers.get('x-real-ip');
  const xForwardedFor = request.headers.get('x-forwarded-for');
  const xForwardedForFirst = xForwardedFor?.split(',')[0]?.trim();

  return cfConnectingIp ?? xRealIp ?? xForwardedForFirst ?? 'unknown';
}

const RATE_LIMIT_ERROR_MESSAGE = `You've hit Exa's free MCP rate limit. To continue using without limits, create your own Exa API key.

Fix: Create API key at https://dashboard.exa.ai/api-keys , then either:
- Set the header: Authorization: Bearer YOUR_EXA_API_KEY
- Or use the URL: https://mcp.exa.ai/mcp?exaApiKey=YOUR_EXA_API_KEY`;

/**
 * Create a JSON-RPC 2.0 error response for rate limiting.
 * MCP uses JSON-RPC 2.0, so we need to return errors in the proper format.
 * Note: We intentionally hide rate limit dimension info (limit set to 0) to prevent
 * users from inferring which limit they hit (QPS vs daily).
 */
function createRateLimitResponse(retryAfterSeconds: number, reset: number): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: RATE_LIMIT_ERROR_MESSAGE,
      },
      id: null,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSeconds),
        'X-RateLimit-Limit': '0',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(reset),
      },
    }
  );
}

/**
 * Check if a JSON-RPC request is a tools/call method that should be rate limited.
 * Returns true only for actual tool invocations, not for protocol methods like
 * tools/list, initialize, ping, resources/list, prompts/list, etc.
 */
function isRateLimitedMethod(body: string): boolean {
  try {
    const parsed = JSON.parse(body);
    return parsed.method === 'tools/call';
  } catch {
    return false;
  }
}

/** 7-day TTL for ~10-minute bypass tracking buckets. */
const BYPASS_BUCKET_TTL_SECONDS = 7 * 24 * 60 * 60;

/**
 * Save IP and user agent for bypass requests to Redis for tracking.
 * Uses ~15-min-bucketed sorted sets (e.g. exa-mcp:bypass:2026-03-24T14:00, exa-mcp:bypass:2026-03-24T14:15)
 * to prevent unbounded growth that would hit Upstash's 100MB single-record limit.
 */
async function saveBypassRequestInfo(ip: string, userAgent: string, debug: boolean): Promise<void> {
  initializeRateLimiters();
  
  if (!redisClient) {
    if (debug) {
      console.log('[EXA-MCP] Cannot save bypass info: Redis not configured');
    }
    return;
  }
  
  try {
    const timestamp = Date.now();
    const date = new Date(timestamp);
    const minutes = date.getUTCMinutes();
    const bucket = Math.floor(minutes / 15) * 15;
    const bucketStr = `${date.toISOString().slice(0, 13)}:${String(bucket).padStart(2, '0')}`;
    const bucketKey = `exa-mcp:bypass:${bucketStr}`;
    const entry = JSON.stringify({ ip, userAgent, timestamp });
    
    await Promise.all([
      redisClient.zadd(bucketKey, { score: timestamp, member: entry }),
      redisClient.expire(bucketKey, BYPASS_BUCKET_TTL_SECONDS),
    ]);
    
    if (debug) {
      console.log(`[EXA-MCP] Saved bypass request info for IP: ${ip}`);
    }
  } catch (error) {
    console.error('[EXA-MCP] Failed to save bypass request info:', error);
  }
}

/**
 * Check rate limits for a given IP.
 * Returns null if within limits, or a Response if rate limited.
 */
async function checkRateLimits(ip: string, debug: boolean): Promise<Response | null> {
  if (!qpsLimiter || !dailyLimiter) {
    return null; // Rate limiting not configured
  }
  
  try {
    // Check QPS limit first (more likely to be hit)
    const qpsResult = await qpsLimiter.limit(ip);
    if (!qpsResult.success) {
      if (debug) {
        console.log(`[EXA-MCP] QPS rate limit exceeded for IP: ${ip}`);
      }
      const retryAfter = Math.ceil((qpsResult.reset - Date.now()) / 1000);
      return createRateLimitResponse(retryAfter, qpsResult.reset);
    }
    
    // Check daily limit
    const dailyResult = await dailyLimiter.limit(ip);
    if (!dailyResult.success) {
      if (debug) {
        console.log(`[EXA-MCP] Daily rate limit exceeded for IP: ${ip}`);
      }
      const retryAfter = Math.ceil((dailyResult.reset - Date.now()) / 1000);
      return createRateLimitResponse(retryAfter, dailyResult.reset);
    }
    
    return null; // Within limits
  } catch (error) {
    // If rate limiting fails, allow the request through (fail open)
    console.error('[EXA-MCP] Rate limit check failed:', error);
    return null;
  }
}

/**
 * Vercel Function entry point for MCP server
 * 
 * This handler is automatically deployed as a Vercel Function and provides
 * Streamable HTTP transport for the MCP protocol.
 * 
 * Supports API key via header (recommended) or URL query parameter:
 * - x-api-key: YOUR_KEY - Pass API key via header (recommended)
 * - Authorization: Bearer YOUR_KEY - Pass API key via header (alternative)
 * - ?exaApiKey=YOUR_KEY - Pass API key via URL (backwards compatible)
 * 
 * Other URL query parameters:
 * - ?tools=web_search_exa,web_fetch_exa - Enable specific tools
 * - ?debug=true - Enable debug logging
 * 
 * Also supports environment variables:
 * - EXA_API_KEY: Your Exa AI API key
 * - DEBUG: Enable debug logging (true/false)
 * - ENABLED_TOOLS: Comma-separated list of tools to enable
 * 
 * Priority: x-api-key header > Authorization header > URL query parameter > environment variable.
 * 
 * ARCHITECTURE NOTE:
 * The mcp-handler library creates a single server instance and doesn't pass
 * the request to the initializeServer callback. To support per-request
 * configuration via URL params (like ?tools=... and ?exaApiKey=...), we
 * create a fresh handler for each request. This ensures:
 * 1. Feature parity with the production Smithery-based deployment at mcp.exa.ai
 * 2. Each request gets its own configuration (no API key leakage between users)
 * 3. Users can specify different tools and API keys per request
 */

/** Extract bearer token from Authorization header. */
function getBearerToken(request: Request): string | undefined {
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match && match[1]) {
      return match[1];
    }
  }
  return undefined;
}

/**
 * Extract configuration from request headers, URL, or environment variables.
 * Priority: header > query parameter > environment variable.
 */

interface RequestConfig {
  exaApiKey?: string;
  enabledTools?: string[];
  debug: boolean;
  userProvidedApiKey: boolean;
  authMethod: 'oauth' | 'api_key' | 'free_tier';
  exaSource?: string;
}

/**
 * Extract configuration from request headers, URL, or environment variables.
 * Priority: x-api-key header > OAuth JWT > plain Bearer API key > query parameter > environment variable.
 */
async function getConfigFromRequest(request: Request): Promise<RequestConfig> {
  let exaApiKey = process.env.EXA_API_KEY;
  let enabledTools: string[] | undefined;
  let debug = process.env.DEBUG === 'true';
  let userProvidedApiKey = false;
  let authMethod: 'oauth' | 'api_key' | 'free_tier' = 'free_tier';

  // 1. Check x-api-key header (highest priority)
  const xApiKey = request.headers.get('x-api-key');
  if (xApiKey) {
    exaApiKey = xApiKey;
    userProvidedApiKey = true;
    authMethod = 'api_key';
  }

  // 2. Check Authorization: Bearer header (fallback when no x-api-key)
  if (!xApiKey) {
    const bearerToken = getBearerToken(request);
    if (bearerToken) {
      // Distinguish JWT (OAuth) from plain API key
      if (isJwtToken(bearerToken)) {
        const claims = await verifyOAuthToken(bearerToken);
        if (claims) {
          // The api_key_id claim IS the API key (ApiKey.id UUID = the key string)
          exaApiKey = claims['exa:api_key_id'];
          userProvidedApiKey = true;
          authMethod = 'oauth';
        } else {
          // JWT verification failed — don't fall through to treating it as an API key
          console.error('[EXA-MCP] Invalid OAuth JWT token');
        }
      } else {
        // Plain API key in Bearer header
        exaApiKey = bearerToken;
        userProvidedApiKey = true;
        authMethod = 'api_key';
      }
    }
  }

  try {
    const parsedUrl = new URL(request.url);
    const params = parsedUrl.searchParams;

    // 3. Check ?exaApiKey=YOUR_KEY (fallback for backwards compat, only if no header)
    if (!xApiKey && !getBearerToken(request) && params.has('exaApiKey')) {
      const keyFromUrl = params.get('exaApiKey');
      if (keyFromUrl) {
        exaApiKey = keyFromUrl;
        userProvidedApiKey = true;
        authMethod = 'api_key';
      }
    }

    // Support ?tools=tool1,tool2
    if (params.has('tools')) {
      const toolsParam = params.get('tools');
      if (toolsParam) {
        enabledTools = toolsParam
          .split(',')
          .map(t => t.trim())
          .filter(t => t.length > 0);
      }
    }

    // Support ?debug=true
    if (params.has('debug')) {
      debug = params.get('debug') === 'true';
    }
  } catch (error) {
    // URL parsing failed, will use env vars
    if (debug) {
      console.error('Failed to parse request URL:', error);
    }
  }

  // Fall back to env vars if no query params were found
  if (!enabledTools && process.env.ENABLED_TOOLS) {
    enabledTools = process.env.ENABLED_TOOLS
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);
  }

  const exaSource = request.headers.get('x-exa-source') || undefined;

  return { exaApiKey, enabledTools, debug, userProvidedApiKey, authMethod, exaSource };
}

/**
 * Create a fresh handler for the given configuration
 * We create a new handler per request to ensure each request gets its own
 * configuration (tools and API key). This prevents API key leakage between
 * different users who might pass different keys via URL.
 */
function createHandler(config: { exaApiKey?: string; enabledTools?: string[]; debug: boolean; userProvidedApiKey: boolean; exaSource?: string }) {
  return createMcpHandler(
    (server: any) => {
      initializeMcpServer(server, config);
    },
    {}, // Server options
    { basePath: '/api' } // Config - basePath for Vercel Functions
  );
}

function hasAuth(request: Request): boolean {
  if (request.headers.get('x-api-key')) return true;
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

/**
 * Main request handler that extracts config from URL and creates
 * a fresh handler for each request
 */
async function handleRequest(request: Request, options?: { forceOAuth?: boolean }): Promise<Response> {
  const debug = process.env.DEBUG === 'true';

  // Check user-agent bypass BEFORE the 401 gate so bypass clients never see auth prompts
  const userAgent = request.headers.get('user-agent') || '';
  const bypassPrefix = process.env.RATE_LIMIT_BYPASS;
  const bypassApiKey = process.env.EXA_API_KEY_BYPASS;
  const bypassRateLimit = bypassPrefix && bypassApiKey && userAgent.startsWith(bypassPrefix);

  // Check if user-agent matches OAUTH_USER_AGENTS (force OAuth on /mcp for these clients)
  const oauthUserAgents = process.env.OAUTH_USER_AGENTS?.split(',').map(s => s.trim()).filter(Boolean) || [];
  const userAgentMatchesOAuth = oauthUserAgents.some(ua => userAgent.includes(ua));

  // Check if request is from a plugin client (force OAuth for plugin users)
  const requestUrl = new URL(request.url);
  const isPluginClient = requestUrl.searchParams.get('client')?.includes('plugin') ?? false;

  // Gate: require auth for /mcp/oauth endpoint, matching user agents, or plugin clients (unless bypassed)
  const requireOAuth = options?.forceOAuth || userAgentMatchesOAuth || isPluginClient;
  if (!bypassRateLimit && requireOAuth && !hasAuth(request)) {
    return create401Response();
  }

  // Extract configuration from request headers, URL, and env vars
  const config = await getConfigFromRequest(request);
  
  if (config.debug) {
    console.log(`[EXA-MCP] Request URL: ${request.url}`);
    console.log(`[EXA-MCP] Enabled tools: ${config.enabledTools?.join(', ') || 'default'}`);
    console.log(`[EXA-MCP] Auth method: ${config.authMethod}`);
    console.log(`[EXA-MCP] API key provided: ${config.userProvidedApiKey ? 'yes' : 'no (using env var)'}`);
  }
  
  // Use separate API key for bypass users and save their IP/user-agent for tracking
  if (bypassRateLimit) {
    config.exaApiKey = bypassApiKey;
    const clientIp = getClientIp(request);
    saveBypassRequestInfo(clientIp, userAgent, config.debug);
  }
  
  // Rate limit users who didn't provide their own API key (including bypass users)
  // Only rate limit actual tool calls (tools/call), not protocol methods like tools/list
  if (!config.userProvidedApiKey && request.method === 'POST') {
    // Clone the request to read the body without consuming it
    const clonedRequest = request.clone();
    const body = await clonedRequest.text();
    
    // Only rate limit actual tool calls, not protocol methods
    if (isRateLimitedMethod(body)) {
      // Initialize rate limiters on first request (lazy init)
      initializeRateLimiters();
      
      const clientIp = getClientIp(request);
      
      if (config.debug) {
        console.log(`[EXA-MCP] Client IP: ${clientIp}, method: tools/call`);
      }
      
      const rateLimitResponse = await checkRateLimits(clientIp, config.debug);
      if (rateLimitResponse) {
        return rateLimitResponse;
      }
    } else if (config.debug) {
      console.log(`[EXA-MCP] Skipping rate limit for non-tool-call method`);
    }
  }
  
  // Create a fresh handler for this request's configuration
  const handler = createHandler(config);
  
  // Normalize URL pathname to /api/mcp for mcp-handler (it checks url.pathname)
  // This handles requests from /mcp and / rewrites
  const url = new URL(request.url);
  if (url.pathname === '/mcp' || url.pathname === '/' || url.pathname === '/mcp/oauth' || url.pathname === '/mcp-oauth' || url.pathname === '/api/mcp-oauth') {
    url.pathname = '/api/mcp';
  }
  
  // Strip sensitive credentials from the request before passing to the MCP handler.
  // Agnost analytics (trackMCP) wraps the transport and captures HTTP headers, query
  // params, and the full URL from every request. Without sanitization, user API keys
  // sent via x-api-key header or ?exaApiKey= query param would be forwarded to the
  // external analytics endpoint. The API key has already been extracted into `config`
  // above, so tools still have access to it — we just prevent it from leaking.
  url.searchParams.delete('exaApiKey');
  const sanitizedHeaders = new Headers(request.headers);
  sanitizedHeaders.delete('x-api-key');
  sanitizedHeaders.delete('authorization');
  request = new Request(url.toString(), {
    method: request.method,
    headers: sanitizedHeaders,
    body: request.body,
    signal: request.signal,
    // @ts-expect-error duplex is required for streaming request bodies in undici/Node
    duplex: 'half',
  });
  
  // Delegate to the handler
  return handler(request);
}

// Export handlers for Vercel Functions
export { handleRequest as GET, handleRequest as POST, handleRequest as DELETE };

export { handleRequest };

