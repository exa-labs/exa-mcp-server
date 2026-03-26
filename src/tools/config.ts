// Configuration for API
export const API_CONFIG = {
  BASE_URL: 'https://api.exa.ai',
  ENDPOINTS: {
    SEARCH: '/search',
  },
  DEFAULT_NUM_RESULTS: 8,
  DEFAULT_MAX_CHARACTERS: 2000
} as const;      