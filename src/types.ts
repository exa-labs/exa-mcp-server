// Exa API Types
export interface ExaSearchRequest {
  query: string;
  type: 'auto' | 'fast' | 'deep' | 'deep-reasoning';
  category?: 'company' | 'research paper' | 'news' | 'pdf' | 'github' | 'personal site' | 'people' | 'financial report';
  includeDomains?: string[];
  excludeDomains?: string[];
  startPublishedDate?: string;
  endPublishedDate?: string;
  numResults?: number;
  additionalQueries?: string[];
  outputSchema?: Record<string, unknown>;
  contents: {
    text?: {
      maxCharacters?: number;
    } | boolean;
    highlights?: {
      maxCharacters?: number;
      numSentences?: number;
      highlightsPerUrl?: number;
      query?: string;
    } | boolean;
    summary?: {
      query?: string;
    } | boolean;
    livecrawl?: 'fallback' | 'preferred';
    maxAgeHours?: number;
    subpages?: number;
    subpageTarget?: string[];
  };
}

export interface ExaAdvancedSearchRequest {
  query: string;
  type: 'auto' | 'fast' | 'instant';
  numResults?: number;
  category?: 'company' | 'research paper' | 'news' | 'pdf' | 'github' | 'personal site' | 'people' | 'financial report';
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
      maxCharacters?: number;
      numSentences?: number;
      highlightsPerUrl?: number;
      query?: string;
    };
    livecrawl?: 'never' | 'fallback' | 'always' | 'preferred';
    maxAgeHours?: number;
    livecrawlTimeout?: number;
    subpages?: number;
    subpageTarget?: string[];
  };
}

export interface ExaSearchResult {
  id?: string;
  title?: string | null;
  url?: string;
  publishedDate?: string;
  author?: string;
  text?: string;
  summary?: string;
  highlights?: string[];
  highlightScores?: number[];
  image?: string;
  favicon?: string;
  score?: number;
  entities?: Record<string, unknown>[];
  extras?: {
    links?: string[];
    imageLinks?: string[];
  };
  subpages?: ExaSearchResult[];
}

export interface ExaSearchStatus {
  id: string;
  status: string;
  source: string;
}

export interface ExaCostDollars {
  total: number;
  search?: Record<string, number>;
  contents?: Record<string, number>;
}

export interface ExaSearchResponse {
  requestId: string;
  autopromptString?: string;
  autoDate?: string;
  resolvedSearchType: string;
  context?: string;
  output?: {
    content: string | Record<string, unknown>;
    grounding?: Array<{
      field: string;
      citations: Array<{
        url: string;
        title: string;
      }>;
      confidence: string;
    }>;
  };
  statuses?: ExaSearchStatus[];
  results: ExaSearchResult[];
  searchTime?: number;
  costDollars?: ExaCostDollars;
}

// Deep Search API Types
export interface ExaDeepSearchRequest {
  query: string;
  type: 'deep' | 'deep-reasoning';
  numResults?: number;
  additionalQueries?: string[];
  outputSchema?: Record<string, unknown>;
  systemPrompt?: string;
  contents: {
    highlights?: {
      maxCharacters?: number;
      numSentences?: number;
      highlightsPerUrl?: number;
      query?: string;
    };
  };
}

export interface ExaDeepSearchResponse {
  requestId: string;
  autopromptString?: string;
  autoDate?: string;
  resolvedSearchType: string;
  output?: {
    content: string | Record<string, unknown>;
    grounding?: Array<{
      field: string;
      citations: Array<{
        url: string;
        title: string;
      }>;
      confidence: string;
    }>;
  };
  statuses?: ExaSearchStatus[];
  results: ExaSearchResult[];
  searchTime?: number;
  costDollars?: ExaCostDollars;
}

export interface ExaContentsResponse {
  requestId?: string;
  results?: ExaSearchResult[];
  statuses?: ExaSearchStatus[];
  costDollars?: ExaCostDollars;
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
