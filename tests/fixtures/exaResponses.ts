import type { SearchResponse } from "exa-js";
import type { ExaContentsResponse, ExaSearchResponse } from "../../src/types.js";

type WebSearchFixtureResponse = ExaSearchResponse & SearchResponse<{ highlights: true }>;

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
  costDollars: { total: 0.007, search: { neural: 0.007 } },
} satisfies WebSearchFixtureResponse;

/** A `notices[]` item as the API renders a relaxed query restriction. */
export const relaxedRestrictionNotice = {
  code: "RESTRICTIONS_RELAXED",
  path: "/query",
  message:
    "No results matched the site restriction site:example.com in the query; these results come from a search with that restriction removed. Filters supplied outside the query were kept.",
  details: { relaxed: [{ kind: "site", operator: "site:example.com" }] },
};

/** A `warnings[]` item as the API renders an ignored request field. */
export const ignoredFieldWarning = {
  code: "IGNORED_FIELD",
  path: "/startCrawlDate",
  message: "startCrawlDate is no longer supported and is ignored. Remove it from the request.",
};

/** `searchResponse` with one warning and one notice. */
export const searchResponseWithNotes = {
  ...searchResponse,
  warnings: [ignoredFieldWarning],
  notices: [relaxedRestrictionNotice],
} satisfies WebSearchFixtureResponse;

export const emptySearchResponse = {
  requestId: "empty-search-request",
  resolvedSearchType: "auto",
  results: [],
  costDollars: { total: 0 },
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
  costDollars: { total: 0.001, contents: { text: 0.001 } },
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
  costDollars: { total: 0 },
} satisfies WebContentsFixtureResponse;
