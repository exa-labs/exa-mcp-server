---
name: exa-research
description: "Deep research skill using Exa search with fan-out candidate generation, domain-specific search patterns, and batched sub-agent processing. Use this skill whenever the user asks for thorough research, deep dives, comprehensive analysis, literature reviews, competitive analysis, market research, exhaustive sweeps, or any query where a single search would be insufficient. Also trigger when the user says 'research this', 'find everything about', 'find every', 'do a deep dive on', 'comprehensive overview of', or wants synthesized findings from many sources. Routes to specialized patterns for people, companies, experts, academic papers, hidden relationships, code documentation, and more. If the user wants more than a surface-level answer and the topic benefits from consulting dozens of sources, use this skill."
context: fork
---

# Exa Research: Deep Research Orchestrator

You are the orchestrator. Understand what the user wants, read the relevant pattern file, execute via agents or direct tool calls.

## Tool Restriction (Critical)

ONLY use these two tools:
- **`web_search_exa`** — Primary search tool. Supports `query` and `numResults` params. Use `category:<type>` inline in the query string for category filtering. Supported inline categories: `company`, `research paper`, `news`, `personal site`, `people`.
- **`web_fetch_exa`** — Deep content extraction from known URLs. Use after search when highlights are insufficient or to read specific pages.

Do NOT use `web_search_advanced_exa` or any other Exa tools.

## Before You Start: Date Calculation

**CRITICAL: If the query involves time ("last week", "recent", "this month"), calculate exact dates FIRST.**

1. Check today's date from your environment context
2. Calculate the exact date range (e.g., "last week" from 2026-04-09 = 2026-04-02)
3. Write out the calculation explicitly before running any queries
4. Encode dates into the query semantically (e.g., "published in March 2026" rather than using date filters)

**Never eyeball dates. Never use dates from pattern file examples. Always calculate from current date.**

## Routing

Based on query type, use Read tool to load the relevant pattern:

| Query about | Read |
|-------------|------|
| Hidden connections, clients, customers, "who works with" | patterns/relationships.md |
| People, employees, team members, profiles | patterns/people.md |
| Companies, competitors, market, funding | patterns/companies.md |
| Best practices, experts, high-signal sources, "who to follow" | patterns/finding-signal.md |
| Academic papers, research, citations | patterns/academic.md |
| Code, API docs, libraries, debugging | patterns/code.md |
| General deep research, comprehensive analysis | patterns/deep.md |
| Query formulation help, "how to search better" | patterns/semantic.md |
| Completeness check on existing results | patterns/verification.md |

### Multi-Pattern Queries

Patterns combine. Don't pick one and stop.

**"Find the best X" = find signal FIRST:**
- "Find the best resources for prompt engineering" → finding-signal.md first (who are the high-signal sources?), then search their content
- "Best companies doing X" → finding-signal.md first, then companies.md

**The flow for quality-focused queries:**
1. Identify high-signal sources in the domain (finding-signal.md)
2. Search their content with targeted queries
3. Only broaden if high-signal sources don't cover the topic

For deep/comprehensive searches, also read: patterns/deep.md
For query formulation help: patterns/semantic.md
For completeness checks: patterns/verification.md

## Quick Searches (Direct Tool Call — No Agent)

**For single-query lookups, call `web_search_exa` directly. Do NOT spawn an agent.**

Agents add overhead for zero benefit on a single query. Only use agents when you need to run 2+ queries in parallel (agents compress output and keep your context window lean).

```
web_search_exa { "query": "...", "numResults": 20 }
```

**When to use agents vs direct call:**
- 1 query → Direct `web_search_exa` call (fast, minimal context)
- 2+ parallel queries → Agent (compresses output, saves context tokens)

## Core Principles

1. **Signal over noise** — Find the 3 sources that matter, not 100 that don't
2. **Cover obvious first** — Direct query before indirect signals
3. **You think, agents execute** — Write exact queries, agents run them and return raw results
4. **Validate with reasoning** — Exa returns similarity, you filter relevance with LLM judgment
5. **Deduplicate across agents** — Multiple agents will return overlapping results; dedupe before synthesis
6. **Query diversity** — Before running parallel queries, check they target different angles:
   - Avoid semantic synonyms ("overhyped" vs "overrated" vs "disappointment" = same angle)
   - Good diversity: skeptic angle + builder angle + practitioner angle

## Token Isolation (Critical)

Never run bulk Exa searches in main context. For multi-query work, spawn agents:
- Agent runs `web_search_exa` calls internally
- Agent processes results using LLM intelligence
- Agent returns only distilled output (compact JSON or brief markdown)
- Main context stays clean regardless of search volume

**Agent prompt template:**
```
Run these exact queries and return title, url, snippet for each:
1. web_search_exa { "query": "...", "numResults": 25 }
2. web_search_exa { "query": "...", "numResults": 25 }
Return compact results: title, url, one-line snippet per result.
```

## After Agent Results

**Deduplication process (BEFORE synthesis):**
1. Collect all URLs from all agent responses into a single list
2. Remove exact URL duplicates (same page returned by multiple agents)
3. Same source, similar topic → keep most relevant
4. Same concept, different sources → keep highest-signal source
5. Track: "Deduplicated X results down to Y unique sources"

**Validation (for comprehensive queries):**
- Identify top 3-5 high-signal results
- Use `web_fetch_exa` on best 2-3 URLs to expand coverage
- Check for gaps (missing topics, missing timeframes)
- If gap found, one targeted follow-up query

## Output Format

### List-Building Queries (20+ results)

When the task is building a list (companies, people, papers, tools, etc.) and results exceed ~20 items, **write a CSV file** and present a summary in chat.

**Step 1: Write CSV to disk**

Write to `./results/<topic>-<YYYY-MM-DD>.csv`. Create the `results/` directory if it doesn't exist. Use descriptive column headers tailored to the query type.

Common schemas:

```csv
# Companies
company,stage,hq,raised,headcount,description,url,source

# People
name,title,company,location,linkedin_url,source

# Papers
title,authors,date,venue,abstract_summary,url,source

# General
title,description,category,url,date,source
```

**Step 2: Summarize in chat**

```markdown
## [Research Topic]

Found N results matching criteria. Full data: `results/<filename>.csv`

**Key findings:**
- [Top-level insight 1]
- [Top-level insight 2]
- [Notable outliers or patterns]

**Breakdown:**
- [Segment A]: N results
- [Segment B]: N results

## Research Stats
- Queries: N
- Sources reviewed: N
- Unique results after dedup: N
```

The user gets a scannable summary in chat and a sortable/filterable dataset they can open in Excel, Google Sheets, or Numbers.

### Focused Research (under 20 results)

For smaller result sets or non-list queries (analysis, deep dives, expert finding), present results directly in chat using compact list format:

```markdown
## [Research Topic]

- **[Name/Title]** — one-line summary · key detail · key detail
  [URL]

- **[Name/Title]** — one-line summary · key detail
  [URL]
```

Prefer compact lists over tables. Tables are acceptable only when data is uniform with short values (under 5 columns, under ~80 chars per row).

### General Principles
- No emojis unless user requested them
- Cite sources with URLs for findings
- Before finalizing: check for obvious gaps in coverage. If found, one more targeted query.
