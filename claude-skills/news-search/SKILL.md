---
name: web-search-advanced-news
description: Search for news articles using Exa advanced search. Full filter support including date ranges, domain filtering, and text matching.
triggers:
  - search news
  - find news articles
  - news search
  - recent news
  - press coverage
  - media coverage
requires_mcp: exa
context: fork
---

# Web Search Advanced - News Category

## Tool Restriction (Critical)

ONLY use `web_search_advanced_exa` with `category: "news"`. Do NOT use other categories or tools.

## Full Filter Support

The `news` category supports ALL available parameters:

### Core
- `query` (required)
- `numResults`
- `type` ("auto", "fast", "deep", "neural")

### Domain filtering
- `includeDomains` (e.g., ["techcrunch.com", "reuters.com"])
- `excludeDomains`

### Date filtering (ISO 8601) - Especially useful for news!
- `startPublishedDate` / `endPublishedDate`
- `startCrawlDate` / `endCrawlDate`

### Text filtering
- `includeText` (must contain ALL)
- `excludeText` (exclude if ANY match)

### Content extraction
- `textMaxCharacters` / `contextMaxCharacters`
- `enableSummary` / `summaryQuery`
- `enableHighlights` / `highlightsNumSentences` / `highlightsPerUrl` / `highlightsQuery`

### Additional
- `userLocation` - useful for regional news
- `moderation`
- `additionalQueries`
- `livecrawl` / `livecrawlTimeout` - use "preferred" or "always" for breaking news

## Token Isolation (Critical)

Never run Exa searches in main context. Always spawn Task agents:
- Agent calls `web_search_advanced_exa` with `category: "news"`
- Agent merges + deduplicates results (watch for syndicated/mirrored content)
- Agent returns distilled output (brief markdown or compact JSON)
- Main context stays clean regardless of search volume

## When to Use

Use this category when you need:
- Recent news coverage on a topic
- Press releases and announcements
- News within a specific date range
- Coverage from specific publications

## Examples

Recent news on a topic:
```
web_search_advanced_exa {
  "query": "OpenAI product announcements",
  "category": "news",
  "startPublishedDate": "2025-01-01",
  "numResults": 15,
  "type": "auto",
  "livecrawl": "preferred"
}
```

News from specific sources:
```
web_search_advanced_exa {
  "query": "AI regulation policy",
  "category": "news",
  "includeDomains": ["reuters.com", "bloomberg.com", "ft.com"],
  "startPublishedDate": "2025-12-01",
  "endPublishedDate": "2026-01-28",
  "numResults": 20,
  "type": "auto"
}
```

Exclude certain topics:
```
web_search_advanced_exa {
  "query": "startup funding rounds",
  "category": "news",
  "excludeText": ["crypto", "blockchain", "NFT"],
  "numResults": 15,
  "type": "auto"
}
```

## Output Format

Return:
1) Results (structured list with headline, publication, date, summary)
2) Sources (URLs with publication name and date)
3) Notes (conflicting reports, developing stories)

Important: Deduplicate syndicated content - many news stories are republished across outlets.
