// Configuration for API
export const API_CONFIG = {
  BASE_URL: 'https://api.exa.ai',
  ENDPOINTS: {
    SEARCH: '/search',
    RESEARCH_TASKS: '/research/v0/tasks',
    CONTEXT: '/context',
    ANSWER: '/answer'
  },
  DEFAULT_NUM_RESULTS: 8,
  DEFAULT_MAX_CHARACTERS: 2000
} as const; 