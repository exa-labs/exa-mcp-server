import { Exa } from 'exa-js';
import { serializeMcpClientMetadata } from '../utils/mcpClientMetadata.js';

const OAUTH_PLACEHOLDER_API_KEY = 'oauth';

export function createExaClient(config?: { exaApiKey?: string; oauthAccessToken?: string }): Exa {
  if (typeof config?.oauthAccessToken === 'string' && config.oauthAccessToken.length > 0) {
    const exa = new Exa(OAUTH_PLACEHOLDER_API_KEY);
    (exa as unknown as { headers?: Headers }).headers?.delete('x-api-key');
    return exa;
  }
  return new Exa(config?.exaApiKey || process.env.EXA_API_KEY || '');
}

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

// Configuration for API
export const API_CONFIG = {
  BASE_URL: 'https://api.exa.ai',
  ENDPOINTS: {
    SEARCH: '/search',
    RESEARCH: '/research/v1',
    CONTEXT: '/context'
  },
  DEFAULT_NUM_RESULTS: 10,
  DEFAULT_MAX_CHARACTERS: 3000
} as const;
