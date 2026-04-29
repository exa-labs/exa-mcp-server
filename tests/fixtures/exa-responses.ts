/**
 * Realistic Exa API response fixtures used by the integration tests.
 *
 * The `requestTags` field is intentionally present on results to verify the
 * sanitizer redacts it (see `src/utils/exaResponseSanitizer.ts`).
 */
import type { ExaSearchResponse } from "../../src/types.js";

export const SEARCH_RESPONSE_BASIC: ExaSearchResponse & { results: Array<Record<string, unknown>> } = {
  requestId: "req_123",
  resolvedSearchType: "auto",
  results: [
    {
      id: "result-1",
      title: "First Result",
      url: "https://example.com/one",
      publishedDate: "2025-04-01",
      author: "Jane Doe",
      highlights: ["First highlight.", "Second highlight."],
      score: 0.91,
      // `requestTags` MUST be redacted by sanitizeSearchResult.
      requestTags: { internalDebug: "should-be-stripped" },
    },
    {
      id: "result-2",
      title: null,
      url: "https://example.com/two",
      text: "Some body text",
      requestTags: ["also-stripped"],
    },
  ],
  searchTime: 142,
};

export const CONTENTS_RESPONSE_BASIC = {
  requestId: "req_456",
  results: [
    {
      id: "https://example.com/page",
      url: "https://example.com/page",
      title: "Example Page",
      text: "Body of the page.",
      author: "Alice",
      publishedDate: "2025-03-15T00:00:00Z",
    },
  ],
  statuses: [
    { id: "https://example.com/page", status: "success", source: "live" },
    {
      id: "https://broken.example.com",
      status: "error",
      source: "live",
      error: { tag: "FETCH_FAILED" },
    },
  ],
  searchTime: 73,
};

export const SEARCH_RESPONSE_EMPTY: ExaSearchResponse = {
  requestId: "req_empty",
  resolvedSearchType: "auto",
  results: [],
};
