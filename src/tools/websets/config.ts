export const WEBSETS_API_CONFIG = {
  BASE_URL: 'https://api.exa.ai',
  ENDPOINTS: {
    WEBSETS: '/v0/websets',
    WEBSET: (id: string) => `/v0/websets/${id}`,
    WEBSET_CANCEL: (id: string) => `/v0/websets/${id}/cancel`,
    ENRICHMENTS: (websetId: string) => `/v0/websets/${websetId}/enrichments`,
    ENRICHMENT: (websetId: string, enrichmentId: string) => `/v0/websets/${websetId}/enrichments/${enrichmentId}`,
    ENRICHMENT_CANCEL: (websetId: string, enrichmentId: string) => `/v0/websets/${websetId}/enrichments/${enrichmentId}/cancel`,
    ITEMS: (websetId: string) => `/v0/websets/${websetId}/items`,
    ITEM: (websetId: string, itemId: string) => `/v0/websets/${websetId}/items/${itemId}`,
  },
  DEFAULT_SEARCH_COUNT: 10,
  DEFAULT_ITEMS_LIMIT: 25,
} as const;
