---
name: web-search-advanced-exa
description: Advanced web search using Exa. Full control over filtering (domains, dates, category, text) plus highlights/summaries and subpage crawling.
triggers:
  - advanced web search
  - filtered web search
  - domain filter
  - date filter
  - site filter
  - search with highlights
  - search with summary
  - crawl subpages
requires_mcp: exa
context: fork
---

# Web Search Advanced (Exa)

## Tool Restriction (Critical)

ONLY use `web_search_advanced_exa`. Do NOT use `web_search_exa` or other Exa tools.

## Token Isolation (Critical)

Never run Exa searches in main context. Always spawn Task agents:
- Agent calls `web_search_advanced_exa`
- Agent merges + deduplicates results (by URL AND near-duplicates like syndicated/mirrored content) before presenting
- Agent extracts only what's needed for the user's request (facts, quotes, code snippets, dates)
- Agent returns distilled output (brief markdown or compact JSON)
- Main context stays clean regardless of search volume

## When to Use

Use `web_search_advanced_exa` when you need **control**:
- Restrict to specific domains (docs sites, arXiv, GitHub, etc.)
- Filter by published date or crawl date
- Force a category (news / research paper / github / pdf / etc.)
- Require/avoid certain words on the page (includeText/excludeText)
- Generate summaries or highlights for retrieval workflows
- Crawl subpages (e.g., pricing/docs/careers linked from a homepage)

If you just want a simple "search + clean context", prefer the basic tool (outside this skill).

## Inputs (Supported)

### Core search parameters
- `query` (string, required): Search query (question, statement, or keywords)
- `numResults` (number, optional; default: 10; range: 1–100)
- `type` (string enum, optional; default: "auto"):
  - "auto", "fast", "deep", "neural"

### Category + domain filtering
- `category` (string enum, optional):
  - "company", "research paper", "news", "pdf", "github", "tweet", "personal site", "people", "financial report"
- `includeDomains` (string[], optional): only return results from these domains
- `excludeDomains` (string[], optional): exclude results from these domains

Important: the Exa Search API notes that the `company` and `people` categories support a limited set of filters; using unsupported filters can error. For `people`, `includeDomains` is limited to LinkedIn domains.

### Date filtering (ISO 8601)
- `startPublishedDate` (string, optional): include results published after this date
- `endPublishedDate` (string, optional): include results published before this date
- `startCrawlDate` (string, optional): include results crawled after this date
- `endCrawlDate` (string, optional): include results crawled before this date

### Text filtering
- `includeText` (string[], optional): only include results containing ALL of these strings
- `excludeText` (string[], optional): exclude results containing ANY of these strings

### Content extraction + generation
- `textMaxCharacters` (number, optional): cap text extracted per result
- `contextMaxCharacters` (number, optional; default: 10000): cap the aggregated context string
- `enableSummary` (boolean, optional; default: false): generate a short summary for each result
- `summaryQuery` (string, optional): focus the summary on a specific question
- `enableHighlights` (boolean, optional; default: false): extract highlight snippets
- `highlightsNumSentences` (number, optional): sentences per highlight
- `highlightsPerUrl` (number, optional): number of highlights per URL
- `highlightsQuery` (string, optional): focus highlights on a specific question

### Live crawl + subpages
- `livecrawl` (string enum, optional; default: "fallback"):
  - "never", "fallback", "always", "preferred"
- `livecrawlTimeout` (number, optional; default: 30000): milliseconds
- `subpages` (number, optional): crawl N subpages per result (typically 1–10)
- `subpageTarget` (string[], optional): keywords to guide which subpages to pick (e.g., ["pricing", "docs", "careers"])

### Additional controls
- `userLocation` (string, optional): two-letter ISO country code (e.g., "US")
- `moderation` (boolean, optional): filter unsafe content
- `additionalQueries` (string[], optional): extra query variations (best paired with `type: "deep"`)

## Dynamic Tuning

Avoid hardcoding. Tune parameters to intent:
- Quick factual lookup → `type: "fast"`, `numResults: 3–8`
- High recall / "don't miss anything" → `type: "deep"`, `numResults: 20–50`, plus `additionalQueries`
- Best semantic match → `type: "neural"` or `"auto"`
- "Latest/current/today" → set `livecrawl: "preferred"` (or `"always"` if freshness is critical)

Use `contextMaxCharacters` to control how much aggregated context comes back.
Use `textMaxCharacters` to control per-result payload size.

## Query Variation

You have two options:
1) Multiple calls (2–3 query rewrites), then merge + dedupe
2) Single call using `additionalQueries` to expand coverage

### Programming query hygiene (reduces noise)

If the query is programming-related, always include the programming language (and optionally framework/version)
to reduce cross-language noise.

Example: use **"Go generics"** instead of just **"generics"**.

## Examples

Domain-restricted search (docs-only):
```
web_search_advanced_exa {
  "query": "rate limits and pricing",
  "includeDomains": ["exa.ai"],
  "type": "auto",
  "numResults": 5
}
```

News within a published date window:
```
web_search_advanced_exa {
  "query": "AI agent security incidents",
  "category": "news",
  "startPublishedDate": "2025-12-01T00:00:00.000Z",
  "endPublishedDate": "2026-01-27T00:00:00.000Z",
  "numResults": 10,
  "type": "auto"
}
```

Exclude noisy results and focus on a term:
```
web_search_advanced_exa {
  "query": "startup pricing page",
  "includeText": ["pricing"],
  "excludeText": ["course"],
  "numResults": 8,
  "type": "fast"
}
```

Enable highlights + summaries for RAG-style extraction:
```
web_search_advanced_exa {
  "query": "MCP protocol best practices",
  "numResults": 8,
  "type": "deep",
  "enableHighlights": true,
  "highlightsPerUrl": 2,
  "highlightsNumSentences": 2,
  "enableSummary": true,
  "summaryQuery": "What are the key best practices and pitfalls?"
}
```

Deep search with query expansion + subpage crawling:
```
web_search_advanced_exa {
  "query": "Company X pricing and enterprise plan",
  "type": "deep",
  "additionalQueries": ["Company X pricing", "Company X enterprise plan", "Company X billing"],
  "numResults": 5,
  "subpages": 3,
  "subpageTarget": ["pricing", "plans", "billing", "enterprise"],
  "livecrawl": "preferred"
}
```

## Error Handling (Critical)

If you receive a **400 error** from the API, it usually means incompatible filter combinations. Retry with a simpler configuration:
1. Remove `category` if combined with `includeDomains`/`excludeDomains`
2. Remove text filters (`includeText`/`excludeText`) if combined with category
3. Simplify to just `query`, `numResults`, and `type`
4. If still failing, fall back to basic `web_search_exa`

Common incompatible combinations:
- `category: "people"` only works with `includeDomains: ["linkedin.com"]`
- `category: "company"` has limited filter support
- Some categories don't support date filters

## Output Format (Recommended)

Return:
1) Answer (short, structured)
2) Sources (URLs, 1-line relevance each; include dates if relevant)
3) "What's uncertain / conflicting" if needed

Before presenting:
- Deduplicate similar results (mirrors/syndication/reposts) and keep the best representative source per claim.

## MCP Configuration

```json
{
  "servers": {
    "exa": {
      "type": "http",
      "url": "https://mcp.exa.ai/mcp?tools=web_search_advanced_exa"
    }
  }
}
```
