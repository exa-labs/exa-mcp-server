export interface WebsetSearchDto {
  query: string;
  count?: number;
  entity?: 'company' | 'person' | 'article' | 'research_paper' | 'custom';
}

export interface WebsetEnrichmentDto {
  description: string;
  format?: 'text' | 'number' | 'date' | 'url' | 'options';
  options?: { label: string }[];
}

export interface WebsetCreateRequest {
  title?: string;
  search?: WebsetSearchDto;
  enrichments?: WebsetEnrichmentDto[];
  externalId?: string;
  metadata?: Record<string, unknown>;
}

export interface WebsetDto {
  id: string;
  object: 'webset';
  status: 'idle' | 'running' | 'paused';
  externalId: string | null;
  title: string | null;
  searches: WebsetSearchResponseDto[];
  enrichments: WebsetEnrichmentResponseDto[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface WebsetSearchResponseDto {
  id: string;
  object: 'webset_search';
  status: 'running' | 'completed' | 'canceled';
  query: string;
  entity: string;
  count: number;
  createdAt: string;
  updatedAt: string;
}

export interface WebsetEnrichmentResponseDto {
  id: string;
  object: 'webset_enrichment';
  status: 'pending' | 'completed' | 'canceled';
  title: string | null;
  description: string;
  format: 'text' | 'number' | 'date' | 'url' | 'options' | null;
  options: { label: string }[] | null;
  instructions: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface WebsetItemDto {
  id: string;
  object: 'webset_item';
  websetId: string;
  source: 'search' | 'import';
  sourceId: string;
  properties: WebsetItemPropertiesDto;
  evaluations: WebsetItemEvaluationDto[];
  enrichments: WebsetItemEnrichmentResultDto[];
  createdAt: string;
  updatedAt: string;
}

export interface WebsetItemPropertiesDto {
  type: 'company' | 'person' | 'article' | 'research_paper' | 'x_post' | 'custom';
  url: string;
  description: string;
  content?: string | null;
  company?: {
    name: string;
    location: string | null;
    employees: number | null;
    industry: string | null;
    about: string | null;
    logoUrl: string | null;
  };
  person?: {
    name: string;
    position: string | null;
    company: { name: string; location: string | null } | null;
    location: string | null;
    pictureUrl: string | null;
  };
  article?: {
    title: string | null;
    author: string | null;
    publishedAt: string | null;
  };
  researchPaper?: {
    title: string | null;
    author: string | null;
    publishedAt: string | null;
  };
  custom?: {
    title: string | null;
    author: string | null;
    publishedAt: string | null;
  };
}

export interface WebsetItemEvaluationDto {
  criterion: string;
  reasoning: string;
  satisfied: 'yes' | 'no' | 'unclear';
  references: ReferenceDto[];
}

export interface WebsetItemEnrichmentResultDto {
  object: 'enrichment_result';
  status: 'pending' | 'completed' | 'canceled';
  reasoning: string | null;
  result: unknown;
  format: 'text' | 'number' | 'date' | 'url' | 'options' | 'email' | 'phone';
  references: ReferenceDto[];
  enrichmentId: string;
}

export interface ReferenceDto {
  url: string;
  title: string | null;
  snippet: string | null;
}

export interface ListWebsetsResponse {
  data: WebsetDto[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface ListWebsetItemsResponse {
  data: WebsetItemDto[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface CreateEnrichmentRequest {
  description: string;
  format?: 'text' | 'number' | 'date' | 'url' | 'options';
  options?: { label: string }[];
  metadata?: Record<string, unknown>;
}
