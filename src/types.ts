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