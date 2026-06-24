import { serializeMcpClientMetadata } from '../utils/mcpClientMetadata.js';

// Build Exa reporting headers, appending x-exa-source if present
export function integrationHeaders(tool: string, config?: Record<string, unknown>) {
  const source = config?.exaSource;
  const mcpSessionId = config?.mcpSessionId;
  const mcpClient = serializeMcpClientMetadata(config?.mcpClient);
  const headers: Record<string, string> = {
    'x-exa-integration': typeof source === 'string' ? `${tool}:${source}` : tool,
  };

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
