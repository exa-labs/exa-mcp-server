---
name: web-search-advanced-pdf
description: Search for PDF documents using Exa advanced search. Full filter support for finding whitepapers, reports, guides, and documentation.
triggers:
  - search pdfs
  - find pdf documents
  - pdf search
  - whitepaper search
  - find reports
  - documentation pdf
requires_mcp: exa
context: fork
---

# Web Search Advanced - PDF Category

## Tool Restriction (Critical)

ONLY use `web_search_advanced_exa` with `category: "pdf"`. Do NOT use other categories or tools.

## Full Filter Support

The `pdf` category supports ALL available parameters:

### Core
- `query` (required)
- `numResults`
- `type` ("auto", "fast", "deep", "neural")

### Domain filtering
- `includeDomains` (e.g., ["gov.uk", "sec.gov"])
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
- `userLocation`
- `moderation`
- `additionalQueries`
- `livecrawl` / `livecrawlTimeout`

## Token Isolation (Critical)

Never run Exa searches in main context. Always spawn Task agents:
- Agent calls `web_search_advanced_exa` with `category: "pdf"`
- Agent merges + deduplicates results before presenting
- Agent returns distilled output (brief markdown or compact JSON)
- Main context stays clean regardless of search volume

## When to Use

Use this category when you need:
- Whitepapers and technical reports
- Government documents and filings
- Product documentation and guides
- Annual reports and financial documents
- Academic papers in PDF format

## Examples

Industry whitepapers:
```
web_search_advanced_exa {
  "query": "enterprise AI adoption best practices",
  "category": "pdf",
  "numResults": 10,
  "type": "auto",
  "enableSummary": true
}
```

Government documents:
```
web_search_advanced_exa {
  "query": "AI safety guidelines framework",
  "category": "pdf",
  "includeDomains": ["gov.uk", "whitehouse.gov", "ec.europa.eu"],
  "numResults": 15,
  "type": "deep"
}
```

Technical documentation:
```
web_search_advanced_exa {
  "query": "kubernetes security hardening guide",
  "category": "pdf",
  "includeText": ["security", "hardening"],
  "numResults": 10,
  "type": "auto"
}
```

## Output Format

Return:
1) Results (structured list with title, source organization, date if available)
2) Sources (PDF URLs with brief description)
3) Notes (document type, authority level)
