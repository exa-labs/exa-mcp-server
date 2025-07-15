// Configuration for API
export const API_CONFIG = {
  BASE_URL: 'https://api.exa.ai',
  ENDPOINTS: {
    SEARCH: '/search',
    RESEARCH_TASKS: '/research/v0/tasks'
  },
  DEFAULT_NUM_RESULTS: 5,
  DEFAULT_MAX_CHARACTERS: 3000
} as const; 