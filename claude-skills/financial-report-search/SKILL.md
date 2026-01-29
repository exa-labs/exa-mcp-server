---
name: web-search-advanced-financial-report
description: Search for financial reports using Exa advanced search. Near-full filter support for finding SEC filings, earnings reports, and financial documents.
triggers:
  - search financial reports
  - find sec filings
  - earnings reports
  - financial documents
  - 10k search
  - annual report search
requires_mcp: exa
context: fork
---

# Web Search Advanced - Financial Report Category

## Tool Restriction (Critical)

ONLY use `web_search_advanced_exa` with `category: "financial report"`. Do NOT use other categories or tools.

## Filter Restrictions (Critical)

The `financial report` category has one known restriction:

- `excludeText` - NOT SUPPORTED (causes 400 error)

## Supported Parameters

### Core
- `query` (required)
- `numResults`
- `type` ("auto", "fast", "deep", "neural")

### Domain filtering
- `includeDomains` (e.g., ["sec.gov", "investor.apple.com"])
- `excludeDomains`

### Date filtering (ISO 8601) - Very useful for financial reports!
- `startPublishedDate` / `endPublishedDate`
- `startCrawlDate` / `endCrawlDate`

### Text filtering
- `includeText` (must contain ALL) - **single-item arrays only**; multi-item causes 400
- ~~`excludeText`~~ - NOT SUPPORTED

### Content extraction
- `textMaxCharacters` / `contextMaxCharacters`
- `enableSummary` / `summaryQuery`
- `enableHighlights` / `highlightsNumSentences` / `highlightsPerUrl` / `highlightsQuery`

### Additional
- `additionalQueries`
- `livecrawl` / `livecrawlTimeout`
- `subpages` / `subpageTarget`

## Token Isolation (Critical)

Never run Exa searches in main context. Always spawn Task agents:
- Agent calls `web_search_advanced_exa` with `category: "financial report"`
- Agent merges + deduplicates results before presenting
- Agent returns distilled output (brief markdown or compact JSON)
- Main context stays clean regardless of search volume

## When to Use

Use this category when you need:
- SEC filings (10-K, 10-Q, 8-K, S-1)
- Quarterly earnings reports
- Annual reports
- Investor presentations
- Financial statements

## Examples

SEC filings for a company:
```
web_search_advanced_exa {
  "query": "Anthropic SEC filing S-1",
  "category": "financial report",
  "numResults": 10,
  "type": "auto"
}
```

Recent earnings reports:
```
web_search_advanced_exa {
  "query": "Q4 2025 earnings report technology",
  "category": "financial report",
  "startPublishedDate": "2025-10-01",
  "numResults": 20,
  "type": "auto"
}
```

Specific filing type:
```
web_search_advanced_exa {
  "query": "10-K annual report AI companies",
  "category": "financial report",
  "includeDomains": ["sec.gov"],
  "startPublishedDate": "2025-01-01",
  "numResults": 15,
  "type": "deep"
}
```

Risk factors analysis:
```
web_search_advanced_exa {
  "query": "risk factors cybersecurity",
  "category": "financial report",
  "includeText": ["cybersecurity"],
  "numResults": 10,
  "enableHighlights": true,
  "highlightsQuery": "What are the main cybersecurity risks?"
}
```

## Output Format

Return:
1) Results (company name, filing type, date, key figures/highlights)
2) Sources (Filing URLs)
3) Notes (reporting period, any restatements, auditor notes)
