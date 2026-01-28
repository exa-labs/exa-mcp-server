---
name: company-research
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

# Company Research

## Tool Restriction (Critical)

ONLY use `company_search_exa`. Do NOT use other Exa tools.

Note: If the user asks for `web_search_advanced` for company research, use `company_search_exa` instead—it returns rich company metadata (headcount, location, funding, revenue, industry).

## Token Isolation (Critical)

Never run Exa searches in main context. Always spawn Task agents:
- Agent runs Exa search internally
- Agent processes results using LLM intelligence
- Agent returns only distilled output (compact JSON or brief markdown)
- Main context stays clean regardless of search volume

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

`company_search_exa` returns rich company metadata including:
- Company name and description
- Headcount and location
- Funding and revenue
- Industry classification
- Website URL

## Browser Fallback

Auto-fallback to Claude in Chrome when:
- Exa returns insufficient results
- Content is auth-gated
- Dynamic pages need JavaScript

## Models

- haiku: fast extraction (listing, discovery)
- opus: synthesis, analysis, browser automation
