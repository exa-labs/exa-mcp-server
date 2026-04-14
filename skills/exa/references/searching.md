# Searching with Exa

You have two tools:
- **`web_search_exa`** -- search by query. Supports `query` and `numResults` params. Use `category:<type>` inline in the query string for category filtering.
- **`web_fetch_exa`** -- read full content from known URLs. Use after search when snippets are insufficient.

Do NOT use `web_search_advanced_exa` or any other Exa tools. Only use these two tools -- do not use Bash, Grep, Read, or Write to process results. Filter and summarize results inline.

## How Exa Search Works

Exa uses vector embeddings, not keywords. It finds pages semantically similar to your query. It does not match keywords exactly, directly understand boolean logic (AND/OR/NOT), or validate that results meet your criteria. You are describing a target page, and Exa returns the nearest neighbors in embedding space.

## Writing Good Queries

**Describe the page you want to find**, not the fact you want to know.

| Looking for | Bad query | Good query |
|---|---|---|
| Blog posts about X | "X" | "detailed blog post about X written by a practitioner" |
| Company doing Y | "Y company" | "category:company startup building Y for enterprise" |
| Person at company | "person at company" | "category:people senior engineer at Acme" |

Write queries as natural grammatical phrases.

**`numResults` sizing -- match to query precision:**

| Query precision | numResults | Example |
|---|---|---|
| Named entity (specific person/company) | 5 | `"WaveForms AI founding story funding details"` |
| Precise filter (narrow category + constraints) | 10 | `"category:company developer tools API testing Series A"` |
| Broad discovery (wide category, few constraints) | 15 | `"category:news engineer launches startup 2025 2026"` |

Never use numResults above 25. If you need more coverage, run more queries with different angles at n=10-15 rather than one query at n=50.

**Use category filters** when searching for a specific entity type. Available inline categories: `company`, `research paper`, `news`, `personal site`, `people`. Add `category:<type>` at the start of your query string.

```
web_search_exa { "query": "category:research paper sparse attention mechanisms for long context", "numResults": 10 }
web_search_exa { "query": "category:people VP Engineering AI infrastructure San Francisco", "numResults": 10 }
web_search_exa { "query": "category:company developer tools for API testing", "numResults": 10 }
```

## Query Diversity

When you need to run multiple queries on the same topic, make sure they target genuinely different angles, not just synonym swaps. "overhyped" vs "overrated" vs "disappointment" are the same angle. A skeptic angle vs a builder angle vs a practitioner angle are genuinely different.

**Word order affects embeddings.** "Python async patterns for web scraping" and "web scraping async patterns in Python" can sometimes return different results. Use this to your advantage when you need coverage -- run 2-3 phrasings in parallel.

## Encoding Time

If your task involves time ("last week", "recent", "this month"), calculate exact dates FIRST from the current date in your environment context. Then encode dates semantically in the query: "published in March 2026" rather than using date filters. Never eyeball dates.

## Anti-Patterns

- Boolean operators ("AND", "NOT") are just words to Exa, not operators
- Quotes don't force exact phrase matching
- Very short queries (1-2 words) produce scattered, low-quality results
- Don't use dates from examples -- always calculate from the current date

## When Searches Return Nothing

If a query returns 0 or only irrelevant results:
a. Make the query longer and more specific
b. Try a different angle, not a synonym swap
c. If multiple angles return nothing, the topic likely has limited web coverage -- report that rather than fabricating results

## Domain-Specific Patterns

If your task involves any of these domains, read the relevant pattern file(s) for specialized query strategies. Pick whichever files match your task — most tasks use 1-2.

| File (same directory as this file) | Domain |
|---|---|
| `patterns-people.md` | People by role, company, location |
| `patterns-companies.md` | Companies by category, stage, competitors, funding |
| `patterns-papers.md` | Academic/research papers |
| `patterns-relationships.md` | Hidden connections (clients, collaborators) |
| `patterns-code.md` | Code, APIs, docs, errors |
| `patterns-news.md` | News, recent events, reactions |

## When `web_fetch_exa` Fails

Fall back to fetching with any other fetch tool you have access to. If that also fails, skip it and work with remaining sources.

## After Getting Results

Exa returns similarity, not validation. You must review titles/snippets and discard irrelevant results using your judgment. Don't assume all results match your criteria. For the most promising results, use `web_fetch_exa` to read the full content.

```
web_fetch_exa {
  "urls": ["https://promising-url-1.com", "https://promising-url-2.com"],
}
```
