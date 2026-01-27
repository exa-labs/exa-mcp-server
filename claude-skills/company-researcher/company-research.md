---
name: company-research
description: Company research using Exa search. Finds company info, competitors, news, tweets, financials, people profiles, builds company lists.
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

ONLY use `web_search_advanced` from Exa. Do NOT use `web_search_exa` or any other Exa tools.

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

## Categories

Use appropriate Exa category:
- company → homepages, gargantuan amount of metadata such as headcount,
  location, funding, revenue
- news → press coverage
- tweet → social presence
- people → People profiles (public data)

## People Search

Public people profiles via Exa: category "people", no other filters
Auth-required profiles → use Claude in Chrome browser fallback

## Browser Fallback

Auto-fallback to Claude in Chrome when:
- Exa returns insufficient results
- Content is auth-gated
- Dynamic pages need JavaScript

## Models

- haiku: fast extraction (listing, discovery)
- opus: synthesis, analysis, browser automation
