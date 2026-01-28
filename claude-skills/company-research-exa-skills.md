---
name: company-research-exa
description: Company research using Exa search. Finds companies with rich metadata (headcount, location, funding, revenue, industry) for competitor analysis, market research, and building company lists.
triggers:
  - company research
  - competitor analysis
  - market research
  - find companies
  - research company
  - company intel
requires_mcp: exa
context: fork
---

# Company Research (Exa)

## Tool Restriction (Critical)

ONLY use `company_research_exa`. Do NOT use other Exa tools.

## Token Isolation (Critical)

Never run Exa searches in main context. Always spawn Task agents:
- Agent runs Exa search internally
- Agent processes results using LLM intelligence
- Agent returns only distilled output (compact JSON or brief markdown)
- Main context stays clean regardless of search volume

## Inputs (Supported)

`company_research_exa` supports:
- `query` (string, required)
- `numResults` (number, optional)

## Dynamic Tuning

No hardcoded numResults. Tune to user intent:
- User says "a few" → 10-20
- User says "comprehensive" → 50-100
- User specifies number → match it
- Ambiguous? Ask: "How many companies would you like?"

## Query Variation

Exa returns different results for different phrasings. For coverage:
- Generate 2-3 query variations
- Run in parallel
- Merge and deduplicate

## Rich Metadata

`company_research_exa` returns rich company metadata including:
- Company name and description
- Headcount and location
- Funding and revenue
- Industry classification
- Website URL

Use appropriate Exa category:
- company → homepages, gargantuan amount of metadata such as headcount,
  location, funding, revenue
- news → press coverage
- tweet → social presence
- people → People profiles (public data)

## People Search

Public people profiles via Exa: category "people", no other filters
Auth-required profiles → use Claude in Chrome browser fallback

## Output Format (Recommended)

Return:
1) Results (structured list; one company per row)
2) Sources (URLs; 1-line relevance each)
3) Notes (uncertainty/conflicts)

Before presenting:
- Deduplicate similar results and keep the best representative source per company.

## Browser Fallback

Auto-fallback to Claude in Chrome when:
- Exa returns insufficient results
- Content is auth-gated
- Dynamic pages need JavaScript

## MCP Configuration

```json
{
  "servers": {
    "exa": {
      "type": "http",
      "url": "https://mcp.exa.ai/mcp?tools=company_research_exa"
    }
  }
}
```
