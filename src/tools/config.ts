import { Exa } from 'exa-js';
import { serializeMcpClientMetadata } from '../utils/mcpClientMetadata.js';

function encodeIntegrationSource(source: string): string {
  return Array.from(new TextEncoder().encode(source), byte =>
    byte <= 127 ? String.fromCharCode(byte) : `%${byte.toString(16).toUpperCase().padStart(2, '0')}`,
  ).join('');
}

// Build Exa reporting headers, appending x-exa-source if present
export function integrationHeaders(tool: string, config?: Record<string, unknown>) {
  const source = config?.exaSource;
  const mcpSessionId = config?.mcpSessionId;
  const mcpClient = serializeMcpClientMetadata(config?.mcpClient);
  const oauthAccessToken = config?.oauthAccessToken;
  const headers: Record<string, string> = {
    'x-exa-integration': typeof source === 'string' ? `${tool}:${encodeIntegrationSource(source)}` : tool,
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
  ENDPOINTS: {
    SEARCH: '/search',
    RESEARCH: '/research/v1',
  },
  TOOL_TIMEOUTS: {
    SEARCH_MS: 60_000,
    FETCH_MS: 60_000,
    ADVANCED_SEARCH_MS: 300_000,
  },
  DEFAULT_NUM_RESULTS: 10,
  DEFAULT_MAX_CHARACTERS: 3000
} as const;
