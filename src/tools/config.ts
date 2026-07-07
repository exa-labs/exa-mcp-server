import { Exa } from 'exa-js';
import { serializeMcpClientMetadata } from '../utils/mcpClientMetadata.js';

// Build Exa reporting headers, appending x-exa-source if present
export function integrationHeaders(tool: string, config?: Record<string, unknown>) {
  const source = config?.exaSource;
  const mcpSessionId = config?.mcpSessionId;
  const mcpClient = serializeMcpClientMetadata(config?.mcpClient);
  const oauthAccessToken = config?.oauthAccessToken;
  const headers: Record<string, string> = {
    'x-exa-integration': typeof source === 'string' ? `${tool}:${source}` : tool,
  };

  if (typeof oauthAccessToken === 'string' && oauthAccessToken.length > 0) {
    headers['Authorization'] = `Bearer ${oauthAccessToken}`;
  }

  if (typeof mcpSessionId === 'string' && mcpSessionId.length > 0) {
    headers['x-exa-mcp-session-id'] = mcpSessionId;
  }

  if (mcpClient) {
    headers['x-exa-mcp-client'] = mcpClient;
  }

  return headers;
}

export function createExaClient(config?: Record<string, unknown>, tool?: string) {
  const exa = createBaseExaClient(config);
  if (tool) {
    applyClientHeaders(exa, integrationHeaders(tool, config));
  }
  return exa;
}

function createBaseExaClient(config?: Record<string, unknown>) {
  const oauthAccessToken = config?.oauthAccessToken;
  if (typeof oauthAccessToken === 'string' && oauthAccessToken.length > 0) {
    const exa = new Exa('oauth');
    (exa as unknown as { headers: Headers }).headers.delete('x-api-key');
    return exa;
  }
  const exaApiKey = config?.exaApiKey;
  return new Exa(typeof exaApiKey === 'string' && exaApiKey.length > 0 ? exaApiKey : process.env.EXA_API_KEY || '');
}

function applyClientHeaders(exa: Exa, headers: Record<string, string>) {
  const client = exa as unknown as { headers: Headers | Record<string, string> };
  const headerBag = client.headers as Headers;
  if (typeof headerBag.set === 'function') {
    Object.entries(headers).forEach(([key, value]) => headerBag.set(key, value));
    return;
  }

  client.headers = {
    ...client.headers,
    ...headers,
  };
}

// Configuration for API
export const API_CONFIG = {
  BASE_URL: 'https://api.exa.ai',
  DEFAULT_POLL_INTERVAL_MS: 4000,
  MIN_POLL_INTERVAL_MS: 1000,
  DEFAULT_WAIT_TIMEOUT_SECONDS: 45,
  MAX_WAIT_TIMEOUT_SECONDS: 50,
  ENDPOINTS: {
    SEARCH: '/search',
    RESEARCH: '/research/v1',
    CONTEXT: '/context',
    RUNS: '/agent/runs',
    RUN_BY_ID: (id: string) => `/agent/runs/${encodeURIComponent(id)}`,
    RUN_CANCEL: (id: string) => `/agent/runs/${encodeURIComponent(id)}/cancel`,
  },
  DEFAULT_NUM_RESULTS: 10,
  DEFAULT_MAX_CHARACTERS: 3000
} as const;
