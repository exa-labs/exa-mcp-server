// Exa API Types
export interface ExaSearchRequest {
  query: string;
  type: 'auto' | 'fast';
  category?: string;
  includeDomains?: string[];
  excludeDomains?: string[];
  startPublishedDate?: string;
  endPublishedDate?: string;
  numResults?: number;
  additionalQueries?: string[];
  contents: {
    text?: {
      maxCharacters?: number;
    } | boolean;
    context?: {
      maxCharacters?: number;
    } | boolean;
    summary?: {
      query?: string;
    } | boolean;
    livecrawl?: 'fallback' | 'preferred';
    subpages?: number;
    subpageTarget?: string[];
  };
}

export interface ExaAdvancedSearchRequest {
  query: string;
  type: 'auto' | 'fast' | 'neural';
  numResults?: number;
  category?: 'company' | 'research paper' | 'news' | 'pdf' | 'github' | 'tweet' | 'personal site' | 'people' | 'financial report';
  includeDomains?: string[];
  excludeDomains?: string[];
  startPublishedDate?: string;
  endPublishedDate?: string;
  startCrawlDate?: string;
  endCrawlDate?: string;
  includeText?: string[];
  excludeText?: string[];
  userLocation?: string;
  moderation?: boolean;
  additionalQueries?: string[];
  contents: {
    text?: {
      maxCharacters?: number;
    } | boolean;
    context?: {
      maxCharacters?: number;
    } | boolean;
    summary?: {
      query?: string;
    } | boolean;
    highlights?: {
      numSentences?: number;
      highlightsPerUrl?: number;
      query?: string;
    };
    livecrawl?: 'never' | 'fallback' | 'always' | 'preferred';
    livecrawlTimeout?: number;
    subpages?: number;
    subpageTarget?: string[];
  };
}

export interface ExaSearchResult {
  id: string;
  title: string;
  url: string;
  publishedDate: string;
  author: string;
  text: string;
  summary?: string;
  image?: string;
  favicon?: string;
  score?: number;
}

export interface ExaSearchResponse {
  requestId: string;
  autopromptString?: string;
  resolvedSearchType: string;
  context?: string;
  results: ExaSearchResult[];
}

// Deep Research API Types (v1)
export interface DeepResearchRequest {
  model: 'exa-research-fast' | 'exa-research' | 'exa-research-pro';
  instructions: string;
  outputSchema?: Record<string, unknown>;
}

export interface DeepResearchStartResponse {
  researchId: string;
  createdAt: number;
  model: string;
  instructions: string;
  outputSchema?: Record<string, unknown>;
  status: string;
}

export interface DeepResearchCheckResponse {
  researchId: string;
  createdAt: number;
  model: string;
  instructions: string;
  outputSchema?: Record<string, unknown>;
  finishedAt?: number;
  status: 'pending' | 'running' | 'completed' | 'canceled' | 'failed';
  output?: {
    content: string;
    parsed?: Record<string, unknown>;
  };
  citations?: Array<{
    id: string;
    url: string;
    title: string;
  }>;
  costDollars?: {
    total: number;
    numSearches: number;
    numPages: number;
    reasoningTokens: number;
  };
}

export interface DeepResearchErrorResponse {
  response: {
    message: string;
    error: string;
    statusCode: number;
  };
  status: number;
  options: any;
  message: string;
  name: string;
}

// Exa Code API Types
export interface ExaCodeRequest {
  query: string;
  tokensNum: number;
  flags?: string[];
}

export interface ExaCodeResponse {
  requestId: string;
  query: string;
  repository?: string;
  response: string;
  resultsCount: number;
  costDollars: string;
  searchTime: number;
  outputTokens?: number;
  traces?: any;
}
