---
name: tell-me-everything-exa
description: Deep research using Exa's parallel search expansion. Starts from a seed query, fans out into 5-8 parallel searches across categories, and synthesizes a comprehensive picture.
triggers:
  - deep research
  - research deeply
  - find everything about
  - comprehensive search
  - expand search
  - tell me everything
  - deep dive
requires_mcp: exa
context: fork
---

# Deep Research

## Overview

This skill showcases Exa's ability to map out the entire web around a topic. Instead of a single search, it **expands** from a seed query into 5-8 parallel searches across different angles and categories, then synthesizes everything into a comprehensive picture.

## Tool Restriction (Critical)

ONLY use `web_search_advanced_exa`. Do NOT use `web_search_exa` or any other Exa tools.

## Token Isolation (Critical)

Never run Exa searches in main context. Always spawn Task agents:
- Agent runs all Exa searches internally
- Agent processes and cross-references results
- Agent returns only distilled output (compact markdown)
- Main context stays clean regardless of search volume

## The Expansion Pattern

### Phase 1: Classify the Query

Before searching, classify what you're researching:

- **Famous person** → "Jony Ive" — unique name, low ambiguity, go straight to parallel expansion
- **Person + Company** → "Yi Yang at Exa.ai" — you have an anchor (the company)
- **Common name only** → "Yi Yang" — high ambiguity, needs disambiguation
- **Company** → "Exa.ai" — search the company itself
- **Topic** → "neural search engines" — no entity ambiguity

This classification determines your search strategy.

### Phase 2: Anchor Search (if needed)

**If the name is common or you have a company anchor, search for context first.**

For **Person + Company** (e.g., "Yi Yang at Exa.ai"):
```
// Search the company team/about page FIRST
web_search_advanced_exa {
  "query": "Exa.ai team members",
  "type": "neural",
  "numResults": 10,
  "includeDomains": ["exa.ai"],
  "livecrawl": "fallback"
}
```

For **Common name only** (e.g., "Yi Yang"):
```
web_search_advanced_exa {
  "query": "Yi Yang",
  "type": "neural",
  "numResults": 10,
  "livecrawl": "fallback"
}
```
If the seed reveals multiple people with the same name, **ask the user for disambiguation context** (company, location, field) before expanding.

For **Famous person**, **Company**, or **Topic**: skip the anchor and go straight to parallel expansion.

### Phase 3: Parallel Expansion

Launch 5-8 searches **in parallel**, each targeting a different angle and category.

#### Famous person example: "Jony Ive"

| # | Query | Category | Type | numResults | Filters |
|---|-------|----------|------|------------|---------|
| 1 | `Jony Ive designer Apple` | `people` | neural | 10 | — |
| 2 | `Jony Ive personal website portfolio design philosophy` | `personal site` | neural | 10 | — |
| 3 | `Jony Ive LoveFrom OpenAI 2024 2025` | `news` | auto | 15 | — |
| 4 | `Jony Ive interview design career Apple legacy` | — | deep | 15 | livecrawl: fallback |
| 5 | `Jony Ive` | `tweet` | auto | 10 | — |
| 6 | `Apple design team Jony Ive` | `company` | neural | 10 | — |
| 7 | `LoveFrom Jony Ive design collective` | `company` | neural | 10 | — |
| 8 | `io Products OpenAI Jony Ive hardware startup` | `company` | neural | 10 | — |

```
// Search 1: LinkedIn / professional profiles
web_search_advanced_exa {
  "query": "Jony Ive designer Apple",
  "category": "people",
  "numResults": 10,
  "type": "neural"
}

// Search 2: Personal site / portfolio
web_search_advanced_exa {
  "query": "Jony Ive personal website portfolio design philosophy",
  "category": "personal site",
  "numResults": 10,
  "type": "neural"
}

// Search 3: News — latest developments
web_search_advanced_exa {
  "query": "Jony Ive LoveFrom OpenAI 2024 2025",
  "category": "news",
  "numResults": 15,
  "type": "auto"
}

// Search 4: Deep interviews and profiles
web_search_advanced_exa {
  "query": "Jony Ive interview design career Apple legacy",
  "type": "deep",
  "livecrawl": "fallback",
  "numResults": 15
}

// Search 5: Social / tweets
web_search_advanced_exa {
  "query": "Jony Ive",
  "category": "tweet",
  "numResults": 10,
  "type": "auto"
}

// Search 6: Company — Apple (surfaces design team orbit)
web_search_advanced_exa {
  "query": "Apple design team Jony Ive",
  "category": "company",
  "numResults": 10,
  "type": "neural"
}

// Search 7: Company — LoveFrom (surfaces design landscape)
web_search_advanced_exa {
  "query": "LoveFrom Jony Ive design collective",
  "category": "company",
  "numResults": 10,
  "type": "neural"
}

// Search 8: Company — io Products (surfaces AI hardware competitors)
web_search_advanced_exa {
  "query": "io Products OpenAI Jony Ive hardware startup",
  "category": "company",
  "numResults": 10,
  "type": "neural"
}
```

**What each angle discovers:**
- **people**: Won't find Ive himself (no LinkedIn), but surfaces his Apple design team collaborators
- **personal site**: Finds lovefrom.com/jony — his official bio
- **news**: Richest angle — OpenAI acquisition ($6.5B), io device, LoveFrom projects
- **deep (no category)**: In-depth interviews (New Yorker, Time, BBC, Stripe Sessions), Wikipedia, documentaries
- **tweet**: Real-time sentiment, industry reactions, departure/leadership commentary
- **company (3x)**: Surfaces adjacent companies and collaborators (Mike Matas/LoveFrom, Marc Newson, Foster + Partners, competing AI hardware startups like Sesame, iyO)

#### Person + Company example ("Yi Yang at Exa.ai"):
```
// Search 1: LinkedIn profile — anchor with company name
web_search_advanced_exa {
  "query": "Yi Yang Exa",
  "category": "people",
  "numResults": 10,
  "type": "neural"
}

// Search 2: Company domain — find mentions of the person
web_search_advanced_exa {
  "query": "Yi Yang",
  "type": "neural",
  "numResults": 10,
  "includeDomains": ["exa.ai"],
  "livecrawl": "fallback"
}

// Search 3: News / press with company context
web_search_advanced_exa {
  "query": "Yi Yang Exa AI search",
  "category": "news",
  "numResults": 10,
  "type": "auto"
}

// Search 4: GitHub with company context
web_search_advanced_exa {
  "query": "Yi Yang exa-mcp-server OR exa-js OR exa-py",
  "category": "github",
  "numResults": 10,
  "type": "auto"
}

// Search 5: Broader web — personal site, blog, talks
web_search_advanced_exa {
  "query": "Yi Yang Exa engineer blog OR talk OR interview",
  "type": "deep",
  "livecrawl": "fallback",
  "numResults": 15
}
```

The key difference: every query carries the **company anchor** ("Exa") and at least one search uses `includeDomains` to search the company's own domain.

#### Company or Topic example:
Use the angles from the company-research skill: homepage, news, tweets, people, competitors, and add uncategorized deep searches.

### Phase 4: Synthesize
Merge all results, deduplicate, cross-reference, and produce a coherent picture. Flag conflicts or ambiguities.

## Category Strengths (learned from testing)

Each category excels at different things:
- **news** — richest for famous people and companies; captures recent events, deals, launches
- **people** — finds LinkedIn profiles; for famous people, surfaces their professional orbit instead
- **personal site** — finds official sites, portfolios, bios (e.g., lovefrom.com/jony)
- **tweet** — real-time sentiment, industry reactions, public commentary
- **company** — searches by company metadata, NOT article content; great for discovering **adjacent companies** and **competitive landscape**, NOT for finding articles about a known company
- **deep (no category)** — best for in-depth articles, interviews, profiles, Wikipedia; use `livecrawl: "fallback"` for freshness
- **github** — code, repos, open source contributions
- **research paper** — academic work, citations

**Key insight**: The `company` category returns companies whose metadata matches your keywords. Searching "Apple design team Jony Ive" won't find apple.com — it finds companies with "IVE" or "design" in their name. This is useful for **mapping orbits and landscapes**, not for finding articles.

## Execution Rules

1. **Classify first** — determine if you have an anchor before searching.
2. **Maximize parallel searches** — run 5-8 searches simultaneously. This is the core value of the skill.
3. **Anchor every query** — for "person at company", include the company name in every expansion query.
4. **Search the company domain** — when an anchor is available, use `includeDomains` with the company's domain.
5. **Adapt angles to the subject** — don't search GitHub for a restaurant, don't search news for a private individual with no press.
6. **Use different categories** — the expansion power comes from hitting different slices of the web.
7. **Use `type: "neural"` for ambiguous queries** — neural search understands meaning, not just keywords.
8. **Use `livecrawl: "fallback"`** for at least one search to catch fresh content.
9. **Disambiguate early** — if common name with no anchor, ask the user before expanding.
10. **numResults**: 10-15 per expansion search. Total across all searches should be 50-100 results before dedup.

## Category-Specific Filter Restrictions

When using categories, remember these cause 400 errors:
- `company`: no domain or date filters
- `people`: no date, text, or excludeDomain filters; includeDomains LinkedIn only
- `tweet`: no text or domain filters
- `github`: no domain filters
- All categories: `includeText`/`excludeText` only support **single-item arrays**

When searching without a category, all filters are available.

## Output Format

Return a structured synthesis:

1) **Queries executed** — table showing all parallel searches run (query, category, type, numResults, filters)
2) **Summary** — 2-3 sentence overview of who/what this is
3) **Key findings** — organized by angle (professional, writing, press, etc.)
4) **Sources** — grouped URLs with 1-line descriptions
5) **Gaps** — what couldn't be found or remains ambiguous
6) **Disambiguation** — if multiple entities share the name, note which results belong to whom
