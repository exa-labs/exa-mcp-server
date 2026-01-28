---
name: web-search-advanced-company
description: Search for companies using Exa advanced search with company category filter. Returns company homepages with rich metadata.
triggers:
  - search companies
  - find company websites
  - company homepages
  - company search advanced
requires_mcp: exa
context: fork
---

# Web Search Advanced - Company Category

## Tool Restriction (Critical)

ONLY use `web_search_advanced_exa` with `category: "company"`. Do NOT use other categories or tools.

## Filter Restrictions (Critical)

The `company` category has LIMITED filter support. The following parameters are **NOT supported** and will cause 400 errors:

- `includeDomains` - NOT SUPPORTED
- `excludeDomains` - NOT SUPPORTED
- `startPublishedDate` / `endPublishedDate` - NOT SUPPORTED
- `startCrawlDate` / `endCrawlDate` - NOT SUPPORTED

## Supported Parameters

- `query` (required)
- `numResults`
- `type` ("auto", "fast", "deep", "neural")
- `includeText` (must contain ALL) - works for filtering company results
- `excludeText` (exclude if ANY match) - works for filtering company results
- `userLocation`
- `moderation`
- `additionalQueries`
- `textMaxCharacters` / `contextMaxCharacters`
- `enableSummary` / `summaryQuery`
- `enableHighlights` / `highlightsNumSentences` / `highlightsPerUrl` / `highlightsQuery`
- `livecrawl` / `livecrawlTimeout`
- `subpages` / `subpageTarget`

## Token Isolation (Critical)

Never run Exa searches in main context. Always spawn Task agents:
- Agent calls `web_search_advanced_exa` with `category: "company"`
- Agent merges + deduplicates results before presenting
- Agent returns distilled output (brief markdown or compact JSON)
- Main context stays clean regardless of search volume

## When to Use

Use this category when you need:
- Company homepages and official websites
- Company metadata (headcount, location, funding, revenue)
- Lists of companies in a specific industry or region

Note: For dedicated company research with rich metadata, consider using `company_research_exa` instead.

## Example

```
web_search_advanced_exa {
  "query": "AI infrastructure startups San Francisco",
  "category": "company",
  "numResults": 20,
  "type": "auto"
}
```

## Output Format

Return:
1) Results (structured list; one company per row)
2) Sources (URLs; 1-line relevance each)
3) Notes (uncertainty/conflicts)
