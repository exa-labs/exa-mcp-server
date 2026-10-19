// Exa API Types
export interface ExaSearchRequest {
  query: string;
  type: "auto" | "lite" | "fast" | "instant" | "deep" | "deep-reasoning";
  category?:
    | "company"
    | "publication"
    | "news"
    | "pdf"
    | "github"
    | "personal site"
    | "people"
    | "financial report";
  includeDomains?: string[];
  excludeDomains?: string[];
  startPublishedDate?: string;
  endPublishedDate?: string;
  numResults?: number;
  additionalQueries?: string[];
  outputSchema?: Record<string, unknown>;
  objective?: string;
  contents: {
    text?:
      | {
          maxCharacters?: number;
        }
      | boolean;
    highlights?:
      | {
          maxCharacters?: number;
          numSentences?: number;
          highlightsPerUrl?: number;
          query?: string;
        }
      | boolean;
    summary?:
      | {
          query?: string;
        }
      | boolean;
    livecrawl?: "fallback" | "preferred";
    maxAgeHours?: number;
    subpages?: number;
    subpageTarget?: string[];
  };
}

export interface ExaAdvancedSearchRequest {
  query: string;
  type: "auto" | "lite" | "fast" | "instant";
  numResults?: number;
  category?:
    | "company"
    | "publication"
    | "news"
    | "pdf"
    | "github"
    | "personal site"
    | "people"
    | "financial report";
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
    text?:
      | {
          maxCharacters?: number;
        }
      | boolean;
    context?:
      | {
          maxCharacters?: number;
        }
      | boolean;
    summary?:
      | {
          query?: string;
        }
      | boolean;
    highlights?: {
      maxCharacters?: number;
      numSentences?: number;
      highlightsPerUrl?: number;
      query?: string;
    };
    livecrawl?: "never" | "fallback" | "always" | "preferred";
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
  error?: {
    tag: string;
    httpStatusCode?: number | null;
  };
}

export interface ExaCostDollars {
  total: number;
  search?: Record<string, number>;
  contents?: Record<string, number>;
}

/**
 * The fields every `warnings[]` and `notices[]` item of a search response
 * carries: `code` is an UPPER_SNAKE token from an open set (clients must
 * tolerate codes they do not know), `path` a JSON Pointer to the request field
 * the item is about (`/query`), and `message` is complete on its own.
 */
export interface ExaSearchNote {
  code: string;
  path: string;
  message: string;
}

/**
 * A note about the request itself, such as a field the API ignores. It is for
 * whoever maintains the code that builds the request, never for a model.
 */
export type ExaSearchWarning = ExaSearchNote;

/**
 * A note about how the results were produced, such as a query restriction
 * relaxed to return any results, written to be shown to a model. `details` is
 * an open object of extra context that never carries what `message` lacks.
 */
export interface ExaSearchNotice extends ExaSearchNote {
  details?: Record<string, unknown>;
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
  warnings?: ExaSearchWarning[];
  notices?: ExaSearchNotice[];
  searchTime?: number;
  costDollars?: ExaCostDollars;
}

// Deep Search API Types
export interface ExaDeepSearchRequest {
  query: string;
  type: "deep" | "deep-reasoning";
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
  warnings?: ExaSearchWarning[];
  notices?: ExaSearchNotice[];
  searchTime?: number;
  costDollars?: ExaCostDollars;
}

export interface ExaContentsResponse {
  requestId?: string;
  results?: ExaSearchResult[];
  statuses?: ExaSearchStatus[];
  searchTime?: number;
  costDollars?: ExaCostDollars;
}

// Deep Research API Types (v1)
export interface DeepResearchRequest {
  model: "exa-research-fast" | "exa-research" | "exa-research-pro";
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
  status: "pending" | "running" | "completed" | "canceled" | "failed";
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

export type AgentEffort = "minimal" | "low" | "medium" | "high" | "xhigh" | "ultra" | "auto";
/** Exa Connect provider ID; the Agent API decides which providers the team may use. */
export type AgentDataSourceProvider = string;

export type AgentRunInput = {
  query: string;
  systemPrompt?: string;
  input?: {
    data?: Array<Record<string, unknown>>;
    exclusion?: Array<Record<string, unknown>>;
  };
  outputSchema?: Record<string, unknown> | null;
  effort?: AgentEffort;
  /** Per-run limits for the metered `auto` and `ultra` efforts; the Agent API validates the ranges. */
  budget?: {
    maxCostDollars?: number;
    maxDurationSeconds?: number;
  };
  previousRunId?: string;
  dataSources?: Array<{
    provider: AgentDataSourceProvider;
  }>;
};

export type ToolContent = {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: true;
};
