import type { SearchResponse } from "exa-js";
import type { ExaContentsResponse, ExaSearchResponse } from "../../src/types.js";

type WebSearchFixtureResponse = ExaSearchResponse &
  SearchResponse<{ highlights: { query: string; maxCharacters: number } }>;

type WebContentsFixtureResponse = ExaContentsResponse &
  SearchResponse<{ text: { maxCharacters: number } }>;

export const searchResponse = {
  requestId: "search-request",
  resolvedSearchType: "auto",
  results: [
    {
      id: "result-1",
      title: "Result One",
      url: "https://example.com/one",
      publishedDate: "2026-04-01T12:00:00.000Z",
      author: "Example Author",
      highlights: ["First highlight", "Second highlight"],
    },
  ],
  searchTime: 0.42,
} satisfies WebSearchFixtureResponse;

export const emptySearchResponse = {
  requestId: "empty-search-request",
  resolvedSearchType: "auto",
  results: [],
} satisfies WebSearchFixtureResponse;

export const contentsResponse = {
  requestId: "contents-request",
  results: [
    {
      id: "page-result",
      title: "Fetched Page",
      url: "https://example.com/page",
      publishedDate: "2026-04-02T12:00:00.000Z",
      author: "Page Author",
      text: "Full page text",
    },
  ],
  statuses: [
    {
      id: "https://example.com/missing",
      status: "error",
      source: "contents",
      error: { tag: "not_found" },
    },
  ],
  searchTime: 0.24,
} satisfies WebContentsFixtureResponse;

export const contentsErrorResponse = {
  requestId: "contents-error-request",
  results: [],
  statuses: [
    {
      id: "https://example.com/missing",
      status: "error",
      source: "contents",
      error: { tag: "not_found" },
    },
  ],
} satisfies WebContentsFixtureResponse;
