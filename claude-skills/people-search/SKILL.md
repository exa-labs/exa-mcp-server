---
name: web-search-advanced-people
description: Search for people profiles using Exa advanced search with people category. LIMITED filter support - no date or text filtering.
triggers:
  - search people advanced
  - find people profiles
  - people search filtered
  - profile search
requires_mcp: exa
context: fork
---

# Web Search Advanced - People Category

## Tool Restriction (Critical)

ONLY use `web_search_advanced_exa` with `category: "people"`. Do NOT use other categories or tools.

## Filter Restrictions (Critical)

The `people` category has LIMITED filter support. The following parameters are **NOT supported** and will cause errors:

- `startPublishedDate` / `endPublishedDate`
- `startCrawlDate` / `endCrawlDate`
- `includeText` / `excludeText`
- `excludeDomains`

**Additional restriction:** `includeDomains` only accepts LinkedIn domains (e.g., "linkedin.com").

## Supported Parameters

- `query` (required)
- `numResults`
- `type` ("auto", "fast", "deep", "neural")
- `includeDomains` - **LinkedIn domains only**
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
- Agent calls `web_search_advanced_exa` with `category: "people"`
- Agent merges + deduplicates results before presenting
- Agent returns distilled output (brief markdown or compact JSON)
- Main context stays clean regardless of search volume

## When to Use

Use this category when you need:
- People profiles from LinkedIn
- Professional background information
- Finding experts in a specific field

For broader people discovery across multiple platforms, use `people_search_exa` instead.

## Examples

LinkedIn profiles:
```
web_search_advanced_exa {
  "query": "VP Engineering AI infrastructure",
  "category": "people",
  "includeDomains": ["linkedin.com"],
  "numResults": 20,
  "type": "auto"
}
```

With query variations:
```
web_search_advanced_exa {
  "query": "machine learning engineer San Francisco",
  "category": "people",
  "additionalQueries": ["ML engineer SF", "AI engineer Bay Area"],
  "numResults": 25,
  "type": "deep"
}
```

## Output Format

Return:
1) Results (name, title, company, location if available)
2) Sources (Profile URLs)
3) Notes (profile completeness, verification status)
