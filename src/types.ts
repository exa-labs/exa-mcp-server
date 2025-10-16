// Exa API Types
export interface ExaSearchRequest {
  query: string;
  type: string;
  category?: string;
  includeDomains?: string[];
  excludeDomains?: string[];
  startPublishedDate?: string;
  endPublishedDate?: string;
  numResults: number;
  contents: {
    text: {
      maxCharacters?: number;
    } | boolean;
    livecrawl?: 'always' | 'fallback' | 'preferred';
    subpages?: number;
    subpageTarget?: string[];
  };
}

export interface ExaCrawlRequest {
  ids: string[];
  text: boolean;
  livecrawl?: 'always' | 'fallback' | 'preferred';
}

export interface ExaSearchResult {
  id: string;
  title: string;
  url: string;
  publishedDate: string;
  author: string;
  text: string;
  image?: string;
  favicon?: string;
  score?: number;
}

export interface ExaSearchResponse {
  requestId: string;
  autopromptString: string;
  resolvedSearchType: string;
  results: ExaSearchResult[];
}

// Tool Types
export interface SearchArgs {
  query: string;
  numResults?: number;
  livecrawl?: 'always' | 'fallback' | 'preferred';
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
  tokensNum: "dynamic" | number;
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

// Shared cost structure used across multiple endpoints
export interface CostDollars {
  total: number;
  breakDown?: Array<{
    search?: number;
    contents?: number;
    breakdown?: {
      keywordSearch?: number;
      neuralSearch?: number;
      contentText?: number;
      contentHighlight?: number;
      contentSummary?: number;
    };
  }>;
  perRequestPrices?: {
    neuralSearch_1_25_results?: number;
    neuralSearch_26_100_results?: number;
    neuralSearch_100_plus_results?: number;
    keywordSearch_1_100_results?: number;
    keywordSearch_100_plus_results?: number;
  };
  perPagePrices?: {
    contentText?: number;
    contentHighlight?: number;
    contentSummary?: number;
  };
}

// Answer API Types
export interface AnswerRequest {
  query: string;
  stream?: boolean;
  text?: boolean;
  outputSchema?: Record<string, any>; // Any valid JSON schema
}

export interface Citation {
  id: string;
  url: string;
  title: string;
  author: string | null;
  publishedDate: string | null;
  text?: string;
  image?: string;
  favicon?: string;
}

export interface AnswerResponse {
  answer: string;
  citations: Citation[];
  costDollars: CostDollars;
}