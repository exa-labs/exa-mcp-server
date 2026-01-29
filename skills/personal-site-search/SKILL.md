---
name: web-search-advanced-personal-site
description: Search personal websites and blogs using Exa advanced search. Full filter support for finding individual perspectives, portfolios, and personal blogs.
triggers:
  - search personal sites
  - find blogs
  - personal blog search
  - portfolio search
  - individual websites
  - blogger search
requires_mcp: exa
context: fork
---

# Web Search Advanced - Personal Site Category

## Tool Restriction (Critical)

ONLY use `web_search_advanced_exa` with `category: "personal site"`. Do NOT use other categories or tools.

## Full Filter Support

The `personal site` category supports ALL available parameters:

### Core
- `query` (required)
- `numResults`
- `type` ("auto", "fast", "deep", "neural")

### Domain filtering
- `includeDomains`
- `excludeDomains` (e.g., exclude Medium if you want independent blogs)

### Date filtering (ISO 8601)
- `startPublishedDate` / `endPublishedDate`
- `startCrawlDate` / `endCrawlDate`

### Text filtering
- `includeText` (must contain ALL)
- `excludeText` (exclude if ANY match)

**Array size restriction:** `includeText` and `excludeText` only support **single-item arrays**. Multi-item arrays (2+ items) cause 400 errors. To match multiple terms, put them in the `query` string or run separate searches.

### Content extraction
- `textMaxCharacters` / `contextMaxCharacters`
- `enableSummary` / `summaryQuery`
- `enableHighlights` / `highlightsNumSentences` / `highlightsPerUrl` / `highlightsQuery`

### Additional
- `additionalQueries`
- `livecrawl` / `livecrawlTimeout`
- `subpages` / `subpageTarget` - useful for exploring portfolio sites

## Token Isolation (Critical)

Never run Exa searches in main context. Always spawn Task agents:
- Agent calls `web_search_advanced_exa` with `category: "personal site"`
- Agent merges + deduplicates results before presenting
- Agent returns distilled output (brief markdown or compact JSON)
- Main context stays clean regardless of search volume

## When to Use

Use this category when you need:
- Individual expert opinions and experiences
- Personal blog posts on technical topics
- Portfolio websites
- Independent analysis (not corporate content)
- Deep dives and tutorials from practitioners

## Examples

Technical blog posts:
```
web_search_advanced_exa {
  "query": "building production LLM applications lessons learned",
  "category": "personal site",
  "numResults": 15,
  "type": "deep",
  "enableSummary": true
}
```

Recent posts on a topic:
```
web_search_advanced_exa {
  "query": "Rust async runtime comparison",
  "category": "personal site",
  "startPublishedDate": "2025-01-01",
  "numResults": 10,
  "type": "auto"
}
```

Exclude aggregators:
```
web_search_advanced_exa {
  "query": "startup founder lessons",
  "category": "personal site",
  "excludeDomains": ["medium.com", "substack.com"],
  "numResults": 15,
  "type": "auto"
}
```

## Output Format

Return:
1) Results (title, author/site name, date, key insights)
2) Sources (URLs)
3) Notes (author expertise, potential biases, depth of coverage)
