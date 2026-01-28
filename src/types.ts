// Exa API Types
export interface ExaSearchRequest {
  query: string;
  type: 'auto' | 'fast' | 'deep';
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
  type: 'auto' | 'fast' | 'deep' | 'neural';
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

export interface ExaCrawlRequest {
  ids: string[];
  text?: {
    maxCharacters?: number;
  } | boolean;
  livecrawl?: 'always' | 'fallback' | 'preferred';
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

// Tool Types
export interface SearchArgs {
  query: string;
  numResults?: number;
  livecrawl?: 'fallback' | 'preferred';
  type?: 'auto' | 'fast' | 'deep';
}

// Deep Research API Types
export interface DeepResearchRequest {
  model: 'exa-research' | 'exa-research-pro';
  instructions: string;
  output?: {
    inferSchema?: boolean;
  };
}

export interface DeepResearchStartResponse {
  id: string;
  outputSchema?: {
    type: string;
    properties: any;
    required: string[];
    additionalProperties: boolean;
  };
}

export interface DeepResearchCheckResponse {
  id: string;
  createdAt: number;
  status: 'running' | 'completed' | 'failed';
  instructions: string;
  schema?: {
    type: string;
    properties: any;
    required: string[];
    additionalProperties: boolean;
  };
  data?: {
    report?: string;
    [key: string]: any;
  };
  operations?: Array<{
    type: string;
    stepId: string;
    text?: string;
    query?: string;
    goal?: string;
    results?: any[];
    url?: string;
    thought?: string;
    data?: any;
  }>;
  citations?: {
    [key: string]: Array<{
      id: string;
      url: string;
      title: string;
      snippet: string;
    }>;
  };
  timeMs?: number;
  model?: string;
  costDollars?: {
    total: number;
    research: {
      searches: number;
      pages: number;
      reasoningTokens: number;
    };
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

export interface ExaCodeResult {
  id: string;
  title: string;
  url: string;
  text: string;
  score?: number;
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
