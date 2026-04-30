// Build Exa reporting headers, appending x-exa-source if present
export function integrationHeaders(tool: string, config?: Record<string, unknown>) {
  const source = config?.exaSource;
  const mcpSessionId = config?.mcpSessionId;
  const headers: Record<string, string> = {
    'x-exa-integration': typeof source === 'string' ? `${tool}:${source}` : tool,
  };

  if (typeof mcpSessionId === 'string' && mcpSessionId.length > 0) {
    headers['x-exa-mcp-session-id'] = mcpSessionId;
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
