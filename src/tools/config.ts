// Configuration for API
export const API_CONFIG = {
  BASE_URL: 'https://api.exa.ai',
  ENDPOINTS: {
    SEARCH: '/search',
    FIND_SIMILAR: '/findSimilar',
    ANSWER: '/answer',
    CONTENTS: '/contents',
    RESEARCH_TASKS: '/research/v0/tasks',
    CONTEXT: '/context'
  },
  DEFAULT_NUM_RESULTS: 8,
  DEFAULT_MAX_CHARACTERS: 2000
} as const; 