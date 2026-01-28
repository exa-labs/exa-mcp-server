---
name: web-search-advanced-tweet
description: Search tweets and Twitter/X content using Exa advanced search. Limited filter support - text and domain filters are NOT supported.
triggers:
  - search tweets
  - find tweets
  - twitter search
  - x search
  - social media search
  - twitter discussions
requires_mcp: exa
context: fork
---

# Web Search Advanced - Tweet Category

## Tool Restriction (Critical)

ONLY use `web_search_advanced_exa` with `category: "tweet"`. Do NOT use other categories or tools.

## Filter Restrictions (Critical)

The `tweet` category has **LIMITED filter support**. The following parameters are **NOT supported** and will cause 400 errors:

- `includeText` - NOT SUPPORTED
- `excludeText` - NOT SUPPORTED
- `includeDomains` - NOT SUPPORTED
- `excludeDomains` - NOT SUPPORTED
- `moderation` - NOT SUPPORTED (causes 500 server error)

## Supported Parameters

### Core
- `query` (required)
- `numResults`
- `type` ("auto", "fast", "deep", "neural")

### Date filtering (ISO 8601) - Use these instead of text filters!
- `startPublishedDate` / `endPublishedDate`
- `startCrawlDate` / `endCrawlDate`

### Content extraction
- `textMaxCharacters` / `contextMaxCharacters`
- `enableHighlights` / `highlightsNumSentences` / `highlightsPerUrl` / `highlightsQuery`
- `enableSummary` / `summaryQuery`

### Additional
- `additionalQueries` - useful for hashtag variations
- `livecrawl` / `livecrawlTimeout` - use "preferred" for recent tweets

## Token Isolation (Critical)

Never run Exa searches in main context. Always spawn Task agents:
- Agent calls `web_search_advanced_exa` with `category: "tweet"`
- Agent merges + deduplicates results before presenting
- Agent returns distilled output (brief markdown or compact JSON)
- Main context stays clean regardless of search volume

## When to Use

Use this category when you need:
- Social discussions on a topic
- Product announcements from company accounts
- Developer opinions and experiences
- Trending topics and community sentiment
- Expert takes and threads

## Examples

Recent tweets on a topic:
```
web_search_advanced_exa {
  "query": "Claude Code MCP experience",
  "category": "tweet",
  "startPublishedDate": "2025-01-01",
  "numResults": 20,
  "type": "auto",
  "livecrawl": "preferred"
}
```

Search with specific keywords (put keywords in query, not includeText):
```
web_search_advanced_exa {
  "query": "launching announcing new open source release",
  "category": "tweet",
  "startPublishedDate": "2025-12-01",
  "numResults": 15,
  "type": "auto"
}
```

Developer sentiment (use specific query terms instead of excludeText):
```
web_search_advanced_exa {
  "query": "developer experience DX frustrating painful",
  "category": "tweet",
  "numResults": 20,
  "type": "deep",
  "livecrawl": "preferred"
}
```

## Output Format

Return:
1) Results (tweet content, author handle, date, engagement if visible)
2) Sources (Tweet URLs)
3) Notes (sentiment summary, notable accounts, threads vs single tweets)

Important: Be aware that tweet content can be informal, sarcastic, or context-dependent.
