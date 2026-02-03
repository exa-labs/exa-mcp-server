---
name: tell-me-everything-exa
description: Deep research using Exa's recursive multi-level search expansion. Starts from a seed query, fans out into 5-8 parallel searches (Level 1), discovers new leads and expands again (Level 2), then optionally drills into the deepest threads (Level 3). Demonstrates Exa's ability to recursively map the entire web around any topic.
triggers:
  - deep research
  - research deeply
  - find everything about
  - comprehensive search
  - expand search
  - tell me everything
  - tell me everything about
  - tell me all about
  - everything about
  - deep dive
  - research everything about
  - know everything about
requires_mcp: exa
context: fork
---

# Deep Research

## Overview

This skill showcases Exa's ability to **recursively** map out the entire web around a topic. Instead of a single search, it expands across **multiple levels**, each feeding the next:

- **Level 1** — Fan out from the seed query into 5-8 parallel searches across different categories
- **Level 2** — Analyze Level 1 results, identify new leads (people, companies, projects, topics discovered), and launch 3-5 new parallel searches on those leads
- **Level 3+** — Continue recursing: each level's discoveries become the next level's search targets. Trace founders to their previous companies, investors to their other bets, competitors to their ecosystems.

Each level discovers new unknowns that feed the next level, creating a tree-like expansion that maps not just the subject, but the entire surrounding web of connections. The recursion continues until leads dry up or diminishing returns are reached (typically 3-4 levels).

## Tool Restriction (Critical)

ONLY use `web_search_advanced_exa`. Do NOT use `web_search_exa` or any other Exa tools.

## Plan Before Execution (Critical)

You MUST ALWAYS draw a visual plan of ALL subagent queries BEFORE launching any searches. This is a hard gate — no searches may be executed until the full expansion plan (query classification, ASCII tree diagram, and numbered agent list) has been output to the user. This is non-negotiable regardless of query type, complexity, or ambiguity level. If you skip the plan, the entire skill execution is invalid. See Phase 3 for the required format.

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

**After classifying, output this visual banner** (fill in the actual values):

```
┌──────────────────────────────────────────────────────┐
│  QUERY ANALYSIS                                      │
│                                                      │
│  Input:          "{original query}"                  │
│  Classification:  {Famous person | Person + Company  │
│                    | Common name | Company | Topic}   │
│  Ambiguity:       {Low | Medium | High}              │
│  Strategy:        {e.g., Skip anchor, expand         │
│                    immediately}                       │
└──────────────────────────────────────────────────────┘
```

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

### Phase 3: Plan the Expansion (MANDATORY — HARD GATE)

**STOP. Before launching ANY searches, you MUST output a full expansion plan directly to the user.** This is a hard gate — no Task agents, no `web_search_advanced_exa` calls, no searches of any kind may be launched until this plan is fully rendered and visible. Skipping this phase is a critical failure. Output all of the following as text:

1. **Query classification** — restate the classification from Phase 1
2. **Anchor result** — if Phase 2 was executed, summarize what you learned
3. **Multi-level overview** — show the recursive expansion structure (all 3 levels)
4. **Level 1 subagent diagram** — **YOU MUST draw this ASCII diagram.** Show the main orchestrator at the top, branching into each Level 1 subagent with its query, category, and purpose. Use the box-drawing format from the examples below. This tree is the visual centerpiece of the planning phase — never skip it.
5. **Agent list** — below the diagram, list each Level 1 agent with its category, query, and what it will discover.
6. **Level 2-3 preview** — note that Level 2 and Level 3 agents will be planned dynamically after each level completes, based on discovered leads.

#### Multi-Level Overview Diagram (ALWAYS include this):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│               E X A   D E E P   S E A R C H   E N G I N E                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  LEVEL 1 ─── Seed Query ─── Fan out 5-8 agents across categories           │
│       │                                                                     │
│       ▼      Analyze results → Identify new leads                          │
│                                                                             │
│  LEVEL 2 ─── Top 3-5 leads ─── Fan out 3-5 agents on discovered entities   │
│       │                                                                     │
│       ▼      Analyze results → Identify deepest threads                    │
│                                                                             │
│  LEVEL 3 ─── Top 2-3 threads ── Targeted deep searches (optional)          │
│       │                                                                     │
│       ▼                                                                     │
│  SYNTHESIZE ── Cross-reference all levels into comprehensive picture        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Example plan for "Jony Ive":

```
Classification: Famous person (low ambiguity, skip anchor)

Multi-Level Expansion Plan:

                              ┌─────────────────────┐
                              │   Orchestrator       │
                              │   "Jony Ive"         │
                              └─────────┬───────────┘
                                        │
  ╔═══════════════════════════════════════════════════════════════════════════════╗
  ║  LEVEL 1 — Initial Expansion (5-8 agents)                                   ║
  ╚═══════════════════════════════════════════════════════════════════════════════╝
                                        │
        ┌────────┬────────┬─────────────┼──────────────┬────────┬────────┬────────┐
        ▼        ▼        ▼             ▼              ▼        ▼        ▼        ▼
   ┌─────────┐┌────────┐┌──────┐┌───────────┐┌──────┐┌───────┐┌───────┐┌───────┐
   │ AGT-1   ││AGT-2   ││AGT-3 ││  AGT-4    ││AGT-5 ││AGT-6  ││AGT-7  ││AGT-8  │
   │ people  ││personal││ news ││  deep     ││tweet ││company││company││company│
   │ profile ││  site  ││latest││  interv   ││social││Apple  ││LoveFrm││io Prod│
   └─────────┘└────────┘└──────┘└───────────┘└──────┘└───────┘└───────┘└───────┘
                                        │
                                        ▼
                              ┌─────────────────────┐
                              │  Analyze L1 results  │
                              │  Extract new leads   │
                              └─────────┬───────────┘
                                        │
  ╔═══════════════════════════════════════════════════════════════════════════════╗
  ║  LEVEL 2 — Lead Expansion (3-5 agents on discovered entities)               ║
  ╚═══════════════════════════════════════════════════════════════════════════════╝
                                        │
              ┌─────────┬───────────────┼───────────────┬─────────┐
              ▼         ▼               ▼               ▼         ▼
         ┌─────────┐┌────────┐┌──────────────┐┌──────────┐┌──────────┐
         │ AGT-9   ││AGT-10  ││   AGT-11     ││ AGT-12   ││ AGT-13   │
         │ (TBD)   ││ (TBD)  ││   (TBD)      ││ (TBD)    ││ (TBD)    │
         │ Lead 1  ││ Lead 2 ││   Lead 3     ││ Lead 4   ││ Lead 5   │
         └─────────┘└────────┘└──────────────┘└──────────┘└──────────┘
                                        │
                                        ▼
                              ┌─────────────────────┐
                              │  Analyze L2 results  │
                              │  Find deep threads   │
                              └─────────┬───────────┘
                                        │
  ╔═══════════════════════════════════════════════════════════════════════════════╗
  ║  LEVEL 3 — Deep Thread Expansion (2-3 agents, optional)                     ║
  ╚═══════════════════════════════════════════════════════════════════════════════╝
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
              ┌──────────┐       ┌──────────┐       ┌──────────┐
              │ AGT-14   │       │ AGT-15   │       │ AGT-16   │
              │ (TBD)    │       │ (TBD)    │       │ (TBD)    │
              │ Thread 1 │       │ Thread 2 │       │ Thread 3 │
              └──────────┘       └──────────┘       └──────────┘
                                        │
                                        ▼
                              ┌─────────────────────┐
                              │  SYNTHESIZE ALL      │
                              │  Cross-ref L1+L2+L3  │
                              └─────────────────────┘

Level 1 Agents:
  1. [people]        "Jony Ive designer Apple"          → professional network & collaborators
  2. [personal site] "Jony Ive portfolio design"        → official bio & personal presence
  3. [news]          "Jony Ive LoveFrom OpenAI 2024"    → recent developments & deals
  4. [deep]          "Jony Ive interview career legacy"  → in-depth profiles & interviews
  5. [tweet]         "Jony Ive"                         → real-time sentiment & reactions
  6. [company]       "Apple design team Jony Ive"       → Apple orbit & design team
  7. [company]       "LoveFrom design collective"       → current venture landscape
  8. [company]       "io Products OpenAI hardware"      → AI hardware competitive landscape

Level 2 Agents: (planned after Level 1 completes — based on discovered leads)
  e.g., If L1 surfaces Marc Newson, Sam Altman partnership, Airbnb rebrand...
  9.  [people]  "Marc Newson industrial designer"     → key collaborator deep-dive
  10. [news]    "Sam Altman Jony Ive AI device 2025"  → partnership details
  11. [company] "Airbnb LoveFrom rebrand"             → client project details
  12. [deep]    "io Products hardware specs team"      → product deep-dive
  13. [news]    "LoveFrom Ferrari collaboration"       → client portfolio

Level 3 Agents: (planned after Level 2 completes — deepest threads only)
  e.g., If L2 reveals io device FCC filing, or LoveFrom-Ferrari design details...
  14. [deep]    "io device FCC filing specs"           → hardware specifics
  15. [news]    "Ferrari Roma LoveFrom interior"       → design case study
  16. [research paper] "Jony Ive design methodology"   → academic analysis
```

#### Example plan for "Yi Yang at Exa.ai":

```
Classification: Person + Company (anchor available)
Anchor result: Found Yi Yang as co-founder on exa.ai/about

Multi-Level Expansion Plan:

                              ┌─────────────────────┐
                              │   Orchestrator       │
                              │ "Yi Yang at Exa.ai"  │
                              └─────────┬───────────┘
                                        │
  ╔═══════════════════════════════════════════════════════════════════════════════╗
  ║  LEVEL 1 — Initial Expansion                                                ║
  ╚═══════════════════════════════════════════════════════════════════════════════╝
                                        │
        ┌─────────┬───────┬─────────────┼──────────────┬─────────┐
        ▼         ▼       ▼             ▼              ▼         ▼
   ┌─────────┐┌───────┐┌──────┐┌───────────┐┌───────┐┌───────┐
   │ AGT-1   ││AGT-2  ││AGT-3 ││  AGT-4    ││AGT-5  ││AGT-6  │
   │ people  ││domain ││ news ││  github   ││ deep  ││company│
   │LinkedIn ││exa.ai ││press ││  code     ││blog/  ││Exa    │
   │         ││       ││      ││           ││talks  ││compet.│
   └─────────┘└───────┘└──────┘└───────────┘└───────┘└───────┘
                                        │
                                        ▼
                              ┌─────────────────────┐
                              │  Analyze L1 results  │
                              │  Extract new leads   │
                              └─────────┬───────────┘
                                        │
  ╔═══════════════════════════════════════════════════════════════════════════════╗
  ║  LEVEL 2 — Lead Expansion (discovered entities)                             ║
  ╚═══════════════════════════════════════════════════════════════════════════════╝
                                        │
              ┌─────────┬───────────────┼───────────────┐
              ▼         ▼               ▼               ▼
         ┌─────────┐┌────────┐┌──────────────┐┌──────────┐
         │ AGT-7   ││AGT-8   ││   AGT-9      ││ AGT-10   │
         │ (TBD)   ││ (TBD)  ││   (TBD)      ││ (TBD)    │
         │ Lead 1  ││ Lead 2 ││   Lead 3     ││ Lead 4   │
         └─────────┘└────────┘└──────────────┘└──────────┘
                                        │
  ╔═══════════════════════════════════════════════════════════════════════════════╗
  ║  LEVEL 3 — Deep Threads (optional)                                          ║
  ╚═══════════════════════════════════════════════════════════════════════════════╝
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
              ┌──────────┐       ┌──────────┐       ┌──────────┐
              │ AGT-11   │       │ AGT-12   │       │ AGT-13   │
              │ (TBD)    │       │ (TBD)    │       │ (TBD)    │
              └──────────┘       └──────────┘       └──────────┘

Level 1 Agents:
  1. [people]        "Yi Yang Exa"                      → LinkedIn & professional profile
  2. [domain]        includeDomains: exa.ai             → mentions on company site
  3. [news]          "Yi Yang Exa AI search"            → press coverage
  4. [github]        "Yi Yang exa-mcp-server"           → open source contributions
  5. [deep]          "Yi Yang Exa engineer blog"        → personal content & talks
  6. [company]       "Exa AI search engine"             → competitive landscape

Level 2 Agents: (planned after Level 1 completes)
  e.g., If L1 surfaces Exa's funding round, co-founders, key competitors...
  7.  [news]    "Exa AI Series A funding"              → funding & investors deep-dive
  8.  [people]  "Will Bryk Exa co-founder"             → co-founder profile
  9.  [company] "Perplexity Tavily AI search API"      → competitive landscape
  10. [deep]    "Exa neural search embeddings"         → technical architecture

Level 3 Agents: (planned after Level 2 completes)
  e.g., If L2 reveals specific technical papers, investor details...
  11. [research paper] "neural search embeddings"      → academic foundations
  12. [news]    "AI search API market 2024 2025"       → market context
  13. [deep]    "Exa vs Perplexity vs Tavily"          → competitive analysis
```

**You MUST output the full expansion plan (classification + ASCII tree diagram + agent list) as text before proceeding.** Do NOT skip the tree diagram. Once the plan is visible, immediately move to Phase 4 to execute it. Do not wait for explicit approval — the plan is informational, showing the user what's about to happen.

**Before launching agents, output this mission-control dashboard** (fill in actual values):

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  E X A   D E E P   S E A R C H   E N G I N E
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Subject:     {query}
  Strategy:    {classification} | Recursive multi-level expansion
  Level:       1 of ~3-4 (depth determined by discoveries)
  Est. scope:  {total_numResults} URLs across {N} categories

  ┌─────────┬──────────────────────────────────┬──────────┐
  │ Agent   │ Mission                          │ Status   │
  ├─────────┼──────────────────────────────────┼──────────┤
  │ AGT-1   │ {category}: {query summary}      │ LAUNCH   │
  │ AGT-2   │ {category}: {query summary}      │ LAUNCH   │
  │ AGT-3   │ {category}: {query summary}      │ LAUNCH   │
  │ AGT-4   │ {category}: {query summary}      │ LAUNCH   │
  │ AGT-5   │ {category}: {query summary}      │ LAUNCH   │
  │ ...     │ (one row per agent)              │ LAUNCH   │
  └─────────┴──────────────────────────────────┴──────────┘

  ARCHITECTURE MAP:
  ┌──────────────────────────────────────────────────────┐
  │  L1 ██████████░░░░░░░░░░░░░░░░  {N} agents ACTIVE  │
  │  L2 ░░░░░░░░░░░░░░░░░░░░░░░░░░  pending            │
  │  L3 ░░░░░░░░░░░░░░░░░░░░░░░░░░  pending            │
  └──────────────────────────────────────────────────────┘

  >> Deploying Level 1: {N} search agents in parallel...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Phase 4: Level 1 — Parallel Expansion

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

**After all Level 1 agents return, output this completion dashboard** (fill in actual values):

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  L E V E L   1   C O M P L E T E
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ┌─────────┬──────────────────────────────────┬──────────┬─────────┐
  │ Agent   │ Mission                          │ Status   │ Results │
  ├─────────┼──────────────────────────────────┼──────────┼─────────┤
  │ AGT-1   │ {category}: {query summary}      │ ██ DONE  │ {n} URLs│
  │ AGT-2   │ {category}: {query summary}      │ ██ DONE  │ {n} URLs│
  │ AGT-3   │ {category}: {query summary}      │ ██ DONE  │ {n} URLs│
  │ AGT-4   │ {category}: {query summary}      │ ██ DONE  │ {n} URLs│
  │ AGT-5   │ {category}: {query summary}      │ ██ DONE  │ {n} URLs│
  │ ...     │ (one row per agent)              │ ██ DONE  │ {n} URLs│
  └─────────┴──────────────────────────────────┴──────────┴─────────┘

  ARCHITECTURE MAP:
  ┌──────────────────────────────────────────────────────┐
  │  L1 ██████████████████████████  {N} agents DONE     │
  │  L2 ░░░░░░░░░░░░░░░░░░░░░░░░░░  planning...        │
  │  L3 ░░░░░░░░░░░░░░░░░░░░░░░░░░  pending            │
  └──────────────────────────────────────────────────────┘

  Total:   {N} sources from {M} raw results
  Leads:   {L} new entities discovered for Level 2 expansion

  >> Extracting leads for Level 2...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Phase 5: Recursive Expansion Loop (Level 2, 3, ... N)

This is the heart of the recursive pattern. After each level completes, **analyze the results to extract new leads**, then expand again. Repeat until leads dry up or diminishing returns are reached.

#### The Recursive Loop

```
┌─────────────────────────────────────────────────────────────┐
│                  RECURSIVE EXPANSION LOOP                    │
│                                                             │
│   ┌──────────────────┐                                      │
│   │ Level N Complete  │                                      │
│   └────────┬─────────┘                                      │
│            ▼                                                │
│   ┌──────────────────┐                                      │
│   │ Extract Leads     │  Identify new entities:             │
│   │ from Results      │  - People (founders, collaborators) │
│   │                   │  - Companies (competitors, clients) │
│   │                   │  - Projects (products, papers)      │
│   │                   │  - Topics (technologies, markets)   │
│   └────────┬─────────┘                                      │
│            ▼                                                │
│   ┌──────────────────┐                                      │
│   │ Enough leads for  │──── NO ───► STOP, go to Synthesis   │
│   │ another level?    │                                      │
│   └────────┬─────────┘                                      │
│            │ YES                                            │
│            ▼                                                │
│   ┌──────────────────┐                                      │
│   │ Plan Level N+1    │  Output:                            │
│   │                   │  - Lead extraction summary          │
│   │                   │  - New agent diagram                │
│   │                   │  - Mission control dashboard        │
│   └────────┬─────────┘                                      │
│            ▼                                                │
│   ┌──────────────────┐                                      │
│   │ Execute Level N+1 │  Launch 3-5 parallel agents         │
│   │ in parallel       │  on discovered leads                │
│   └────────┬─────────┘                                      │
│            ▼                                                │
│   ┌──────────────────┐                                      │
│   │ Level N+1 Complete│ ──── LOOP BACK TO TOP               │
│   └──────────────────┘                                      │
└─────────────────────────────────────────────────────────────┘
```

#### Step 1: Extract Leads

After each level completes, analyze all results and identify **expansion leads** — new entities that surfaced but weren't the original search target:

- **People**: founders, collaborators, investors, key employees mentioned
- **Companies**: competitors, clients, partners, portfolio companies, previous employers
- **Projects**: products, open-source repos, research papers, patents
- **Topics**: technologies, markets, regulatory issues, trends

**Prioritize leads by:**
1. **Frequency** — entities mentioned across multiple Level N results
2. **Relevance** — directly connected to the original query
3. **Information gap** — not yet well-covered by existing results
4. **Novelty** — surprising or unexpected connections

**Output a lead extraction summary:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  L E A D   E X T R A C T I O N  —  L E V E L  {N}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Discovered {D} new entities from Level {N} results:

  ┌─────┬──────────────┬──────────────────────────────┬──────────┐
  │  #  │ Type         │ Entity                       │ Source   │
  ├─────┼──────────────┼──────────────────────────────┼──────────┤
  │  1  │ {person}     │ {entity name}                │ AGT-{n}  │
  │  2  │ {company}    │ {entity name}                │ AGT-{n}  │
  │  3  │ {project}    │ {entity name}                │ AGT-{n}  │
  │  4  │ {topic}      │ {entity name}                │ AGT-{n}  │
  │ ... │              │                              │          │
  └─────┴──────────────┴──────────────────────────────┴──────────┘

  Selected for Level {N+1} expansion: {leads 1, 2, 3, ...}
  Rationale: {why these leads were chosen}

  >> Planning Level {N+1} agents...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### Step 2: Plan and Execute Next Level

Draw a new agent diagram and mission-control dashboard for the next level, then launch agents in parallel. Continue numbering agents sequentially (e.g., Level 1 had AGT-1 through AGT-8, Level 2 starts at AGT-9).

**Each level's mission-control dashboard MUST include an updated architecture map** showing progress across all levels:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  E X A   D E E P   S E A R C H   E N G I N E
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Subject:     {query}
  Level:       {N} (triggered by {M} leads from Level {N-1})

  ┌─────────┬──────────────────────────────────┬──────────┐
  │ Agent   │ Mission                          │ Status   │
  ├─────────┼──────────────────────────────────┼──────────┤
  │ AGT-{x} │ {category}: {query summary}      │ LAUNCH   │
  │ AGT-{y} │ {category}: {query summary}      │ LAUNCH   │
  │ ...     │ (one row per agent)              │ LAUNCH   │
  └─────────┴──────────────────────────────────┴──────────┘

  ARCHITECTURE MAP:
  ┌──────────────────────────────────────────────────────┐
  │  L1 ██████████████████████████  {n} agents ✓ DONE   │
  │  L2 ██████████░░░░░░░░░░░░░░░░  {n} agents ACTIVE  │
  │  L3 ░░░░░░░░░░░░░░░░░░░░░░░░░░  pending            │
  └──────────────────────────────────────────────────────┘
  Cumulative: {total_agents} agents | {total_sources} sources

  >> Deploying Level {N}: {n} agents on discovered leads...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Similarly, each level's **completion dashboard** must update the architecture map:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  L E V E L   {N}   C O M P L E T E
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ┌─────────┬──────────────────────────────────┬──────────┬─────────┐
  │ Agent   │ Mission                          │ Status   │ Results │
  ├─────────┼──────────────────────────────────┼──────────┼─────────┤
  │ AGT-{x} │ {category}: {query summary}      │ ██ DONE  │ {n} URLs│
  │ ...     │ (one row per agent)              │ ██ DONE  │ {n} URLs│
  └─────────┴──────────────────────────────────┴──────────┴─────────┘

  ARCHITECTURE MAP:
  ┌──────────────────────────────────────────────────────┐
  │  L1 ██████████████████████████  {n} agents ✓ DONE   │
  │  L2 ██████████████████████████  {n} agents ✓ DONE   │
  │  L3 ░░░░░░░░░░░░░░░░░░░░░░░░░░  planning...        │
  └──────────────────────────────────────────────────────┘
  Cumulative: {total_agents} agents | {total_sources} sources

  Leads:   {L} new entities discovered for Level {N+1}

  >> Extracting leads for Level {N+1}...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

The architecture map is the visual heartbeat — it lets the viewer see the recursive depth growing in real time.

#### Step 3: Repeat or Stop

After each level completes, repeat the lead extraction. **Stop expanding when:**
- No significant new entities are discovered
- Remaining leads are too tangential to the original query
- You've reached 3-4 levels (practical maximum for most queries)
- Total agent count exceeds ~20 (diminishing returns)

**When stopping, immediately proceed to Phase 6 (Synthesize) and produce the final report.** The skill ends after delivering the complete synthesis — no further searches after the report.

#### Worked Example: "AI legal tech startups in San Francisco"

This example shows how recursive expansion maps an entire industry ecosystem:

```
╔═══════════════════════════════════════════════════════════════════════════════════╗
║  RECURSIVE EXPANSION — "AI legal tech startups in San Francisco"                ║
╠═══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                 ║
║  LEVEL 1: Map the landscape                                                     ║
║  ─────────────────────────                                                      ║
║  AGT-1  [company]  "AI legal tech startup San Francisco"    → company list      ║
║  AGT-2  [news]     "AI legaltech startup SF funding 2024"   → recent funding    ║
║  AGT-3  [deep]     "artificial intelligence law firms"      → industry analysis ║
║  AGT-4  [tweet]    "AI legal tech startup"                  → buzz & sentiment  ║
║  AGT-5  [company]  "legal AI contract review startup"       → niche players     ║
║  AGT-6  [news]     "legaltech San Francisco Series A B"     → deal flow         ║
║                                                                                 ║
║  DISCOVERED: Harvey AI, Casetext (acquired by Thomson Reuters),                 ║
║  EvenUp, Ironclad, Atrium (shutdown), Hebbia, CoCounsel...                     ║
║                                                                                 ║
║  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─                  ║
║                                                                                 ║
║  LEVEL 2: Explore the companies & founders                                      ║
║  ─────────────────────────────────────────                                      ║
║  AGT-7  [people]   "Harvey AI founders Winston Weinberg"    → founder profiles  ║
║  AGT-8  [company]  "Ironclad contract management"           → company deep-dive ║
║  AGT-9  [news]     "Harvey AI OpenAI legal 2024 2025"       → Harvey spotlight  ║
║  AGT-10 [people]   "EvenUp founders legal AI"               → EvenUp team       ║
║  AGT-11 [deep]     "Casetext Thomson Reuters acquisition"   → acquisition story ║
║                                                                                 ║
║  DISCOVERED: Winston Weinberg (ex-O'Melveny), Gabriel Pereyra (ex-DeepMind),   ║
║  Jason Boehmig (Ironclad CEO, ex-Fenwick), investors (Sequoia, Kleiner),        ║
║  key acquirers (Thomson Reuters, LexisNexis)...                                ║
║                                                                                 ║
║  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─                  ║
║                                                                                 ║
║  LEVEL 3: Trace founder origins & investor network                              ║
║  ─────────────────────────────────────────────────                              ║
║  AGT-12 [people]   "Gabriel Pereyra DeepMind Google"        → AI research roots ║
║  AGT-13 [company]  "Sequoia Kleiner legal tech portfolio"   → investor overlap  ║
║  AGT-14 [news]     "Thomson Reuters LexisNexis AI strategy" → acquirer strategy ║
║  AGT-15 [deep]     "O'Melveny Myers law firm AI adoption"   → law firm demand   ║
║                                                                                 ║
║  DISCOVERED: DeepMind → Google legal AI tools, Thomson Reuters →                ║
║  broader AI strategy, Sequoia → other legal/AI bets...                         ║
║                                                                                 ║
║  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─                  ║
║                                                                                 ║
║  LEVEL 4: Map the upstream ecosystem                                            ║
║  ────────────────────────────────────                                           ║
║  AGT-16 [news]     "Google legal AI enterprise tools"       → big tech in legal ║
║  AGT-17 [company]  "Thomson Reuters AI acquisitions"        → acquirer pipeline ║
║  AGT-18 [deep]     "Sequoia AI legal portfolio companies"   → VC thesis         ║
║                                                                                 ║
║  >> Leads exhausted — proceeding to synthesis                                   ║
║                                                                                 ║
║  TOTAL: 18 agents across 4 levels, ~150+ unique sources                        ║
╚═══════════════════════════════════════════════════════════════════════════════════╝
```

**What the recursive expansion reveals that a flat search never would:**
- **Level 1** finds the companies (Harvey, Ironclad, Casetext, EvenUp)
- **Level 2** finds the people behind them and recent deals
- **Level 3** traces where those people came from (DeepMind, big law firms) and who's investing
- **Level 4** maps the upstream ecosystem (big tech legal AI, acquirer strategies, VC theses)

The result is a **complete map** of the AI legal tech ecosystem: companies → founders → their origins → the forces shaping the industry. No single search could produce this.

### Phase 6: Synthesize and Stop

Merge results from **ALL levels**, deduplicate, cross-reference, and produce a coherent picture. The synthesis must reflect the recursive depth — show how discoveries at each level fed the next.

**This is the final phase. After producing the synthesis report, the skill is complete. Do not launch additional searches after this phase.**

**Output a final completion dashboard across all levels:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  A L L   L E V E L S   C O M P L E T E
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ┌─────────┬──────────────────────────────────┬──────────┬─────────┐
  │ Level   │ Focus                            │ Agents   │ Sources │
  ├─────────┼──────────────────────────────────┼──────────┼─────────┤
  │ L1      │ {Initial expansion}              │ {n} agts │ {n} URLs│
  │ L2      │ {Lead expansion}                 │ {n} agts │ {n} URLs│
  │ L3      │ {Deep threads}                   │ {n} agts │ {n} URLs│
  │ L4      │ {Upstream ecosystem}             │ {n} agts │ {n} URLs│
  └─────────┴──────────────────────────────────┴──────────┴─────────┘

  ARCHITECTURE MAP (FINAL):
  ┌──────────────────────────────────────────────────────┐
  │  L1 ██████████████████████████  {n} agents ✓ DONE   │
  │  L2 ██████████████████████████  {n} agents ✓ DONE   │
  │  L3 ██████████████████████████  {n} agents ✓ DONE   │
  │  L4 ██████████████████████████  {n} agents ✓ DONE   │
  └──────────────────────────────────────────────────────┘

  Total:     {N} agents across {L} levels
  Sources:   {S} unique URLs from {M} raw results
  Dedup:     {removed} duplicates removed
  Domains:   {D} unique domains

  >> Synthesizing all levels into final report...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Flag conflicts or ambiguities across levels. After producing the synthesis report, the skill execution is complete — no further searches.

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

### Level 1 Rules
1. **ALWAYS draw the plan first** — You MUST output the full expansion plan (classification + multi-level overview + ASCII tree diagram + agent list + mission-control dashboard) BEFORE launching any searches. This is the #1 rule and cannot be skipped under any circumstances. No searches, no Task agents, nothing until the plan is visible.
2. **Classify first** — determine if you have an anchor before searching.
3. **Maximize parallel searches** — run 5-8 searches simultaneously. This is the core value of the skill.
4. **Anchor every query** — for "person at company", include the company name in every expansion query.
5. **Search the company domain** — when an anchor is available, use `includeDomains` with the company's domain.
6. **Adapt angles to the subject** — don't search GitHub for a restaurant, don't search news for a private individual with no press.
7. **Use different categories** — the expansion power comes from hitting different slices of the web.
8. **Use `type: "neural"` for ambiguous queries** — neural search understands meaning, not just keywords.
9. **Use `livecrawl: "fallback"`** for at least one search to catch fresh content.
10. **Disambiguate early** — if common name with no anchor, ask the user before expanding.
11. **numResults**: 10-15 per expansion search.

### Recursive Expansion Rules
12. **ALWAYS recurse** — After Level 1, you MUST extract leads and run at least Level 2. The recursive expansion is the core differentiator of this skill. Never stop at Level 1.
13. **Extract leads systematically** — After each level, scan all results for new entities (people, companies, projects, topics) not yet searched. Output the lead extraction dashboard.
14. **Plan each level before executing** — Output a new agent diagram and mission-control dashboard before launching each level's agents. Same format as Level 1 planning.
15. **Continue numbering agents sequentially** — Level 2 agents continue from where Level 1 left off (e.g., AGT-9, AGT-10...).
16. **3-5 agents per recursive level** — Each level after Level 1 should launch 3-5 agents (fewer than Level 1, more focused).
17. **Stop when leads dry up** — Stop recursing when: no significant new entities, leads too tangential, reached 4+ levels, or total agents exceed ~20.
18. **Each level explores a different dimension** — Level 1 maps the landscape, Level 2 explores discovered entities, Level 3+ traces origins and connections. Avoid re-searching what previous levels already covered.
19. **Cross-reference across levels** — When synthesizing, explicitly show how Level N discoveries fed Level N+1 searches. This is the visual proof of recursive power.

## Category-Specific Filter Restrictions

When using categories, remember these cause 400 errors:
- `company`: no domain or date filters
- `people`: no date, text, or excludeDomain filters; includeDomains LinkedIn only
- `tweet`: no text or domain filters
- `github`: no domain filters
- All categories: `includeText`/`excludeText` only support **single-item arrays**

When searching without a category, all filters are available.

## Output Format

Return a structured synthesis with these sections in order:

### 1. Executive Summary
2-3 sentences providing a high-level overview of who/what this is and what the research uncovered.

### 2. Recursive Discovery Chain

**This is the key output that demonstrates recursive expansion.** Show how each level's discoveries fed the next level:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  D I S C O V E R Y   C H A I N
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  L1 "{seed query}"
   ├── discovered: {entity A}, {entity B}, {entity C}...
   │
   └─► L2 explored: {entity A}, {entity B}
        ├── discovered: {entity D}, {entity E}...
        │
        └─► L3 explored: {entity D}
             ├── discovered: {entity F}...
             │
             └─► L4 explored: {entity F}
                  └── (leads exhausted)

  Depth reached: {N} levels
  Total entities mapped: {M}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 3. Key Findings
Organized **by level**, showing what each depth of expansion uncovered. Each finding should reference the agent and level that surfaced it. Highlight findings that only emerged at deeper levels — these prove the value of recursive expansion.

### 4. Gaps & Disambiguation
- What couldn't be found or remains ambiguous
- If multiple entities share the name, note which results belong to whom
- Note any leads that were intentionally not pursued and why

### 5. Complete Source Library

**This is the demo payoff. List every single URL returned by every agent across ALL levels. Never truncate. Never summarize. Never skip URLs.**

Output this visual format (fill in actual values):

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  C O M P L E T E   S O U R C E   L I B R A R Y
  {N} sources across {M} domains | {L} levels | {A} agents
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

═══ LEVEL 1 — {description} ═══════════════════════════════

── AGT-1 | {category} | "{query}" ── ({n} results) ──

  1. {Page Title}
     {URL}
     {One-line description of what this page contains}

  2. {Page Title}
     {URL}
     {One-line description}

  ... (every result from this agent)

── AGT-2 | {category} | "{query}" ── ({n} results) ──

  1. {Page Title}
     {URL}
     {One-line description}

  ... (every result from this agent)

{... continue for every Level 1 agent ...}

═══ LEVEL 2 — {description} ═══════════════════════════════
    Triggered by: {leads discovered in Level 1}

── AGT-{n} | {category} | "{query}" ── ({n} results) ──

  1. {Page Title}
     {URL}
     {One-line description}

  ... (every result from this agent)

{... continue for every Level 2 agent ...}

═══ LEVEL 3 — {description} ═══════════════════════════════
    Triggered by: {leads discovered in Level 2}

{... continue for every Level 3+ agent ...}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  TOTAL: {N} unique sources | {M} raw results
         {D} domains | {A} agents | {L} levels
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Rules for the Source Library:**
- List every URL returned by every agent across ALL levels — no exceptions
- **Group by level first, then by agent** so the viewer sees the recursive depth
- Include "Triggered by" annotations showing which Level N-1 lead caused this Level N search
- Include a one-line description for each URL (from the result's title or summary)
- Mark duplicates that appeared in multiple agents with `[also: AGT-{n}]` rather than removing them
- The sheer volume of URLs across multiple levels is the visual payoff — it demonstrates the breadth AND depth of Exa's recursive search
