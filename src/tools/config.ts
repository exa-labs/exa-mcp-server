// Build x-exa-integration headers, appending x-exa-source if present
export function integrationHeaders(tool: string, config?: Record<string, unknown>) {
  const source = config?.exaSource;
  return { 'x-exa-integration': typeof source === 'string' ? `${tool}:${source}` : tool };
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