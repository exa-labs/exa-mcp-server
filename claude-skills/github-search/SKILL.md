---
name: web-search-advanced-github
description: Search GitHub repositories and code using Exa advanced search. Full filter support for finding repos, code examples, and open source projects.
triggers:
  - search github
  - find repos
  - github search
  - find repositories
  - open source search
  - code examples
requires_mcp: exa
context: fork
---

# Web Search Advanced - GitHub Category

## Tool Restriction (Critical)

ONLY use `web_search_advanced_exa` with `category: "github"`. Do NOT use other categories or tools.

## Full Filter Support

The `github` category supports ALL available parameters:

### Core
- `query` (required)
- `numResults`
- `type` ("auto", "fast", "deep", "neural")

### Domain filtering
- `includeDomains` (typically not needed - already filtered to GitHub)
- `excludeDomains`

### Date filtering (ISO 8601)
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
- `additionalQueries` - useful for finding repos with different naming conventions
- `livecrawl` / `livecrawlTimeout`
- `subpages` / `subpageTarget` - useful for crawling README, docs folders

## Token Isolation (Critical)

Never run Exa searches in main context. Always spawn Task agents:
- Agent calls `web_search_advanced_exa` with `category: "github"`
- Agent merges + deduplicates results before presenting
- Agent returns distilled output (brief markdown or compact JSON)
- Main context stays clean regardless of search volume

## When to Use

Use this category when you need:
- Open source repositories for specific functionality
- Code examples and implementations
- Libraries and frameworks
- Project documentation and READMEs

## Query Hygiene (Important)

Always include the programming language to reduce noise:
- "Go HTTP client" instead of just "HTTP client"
- "Python async web scraper" instead of "web scraper"
- "Rust CLI argument parser" instead of "CLI parser"

## Examples

Find repositories:
```
web_search_advanced_exa {
  "query": "Python MCP server implementation",
  "category": "github",
  "numResults": 15,
  "type": "auto"
}
```

Recent projects:
```
web_search_advanced_exa {
  "query": "LLM agent framework TypeScript",
  "category": "github",
  "startCrawlDate": "2025-01-01",
  "numResults": 20,
  "type": "deep"
}
```

With documentation crawling:
```
web_search_advanced_exa {
  "query": "React component library accessible",
  "category": "github",
  "numResults": 10,
  "subpages": 3,
  "subpageTarget": ["README", "docs", "examples"],
  "type": "auto"
}
```

Exclude certain frameworks:
```
web_search_advanced_exa {
  "query": "JavaScript state management library",
  "category": "github",
  "excludeText": ["redux", "mobx"],
  "numResults": 15,
  "type": "auto"
}
```

## Output Format

Return:
1) Results (repo name, description, stars/activity if visible, language)
2) Sources (GitHub URLs)
3) Notes (maintenance status, documentation quality)
