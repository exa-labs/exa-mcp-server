
# Semantic Query Strategies

Exa uses vector embeddings. This fundamentally differs from keyword search. These strategies are hypotheses — validate through results quality.

## Core Principle

Exa finds pages that are **semantically similar** to your query. It doesn't:
- Match keywords exactly
- Validate that results meet criteria
- Understand boolean logic (AND, OR, NOT)

You're describing a target, and Exa returns the nearest neighbors in embedding space.

## Strategy 1: Describe the Page

Don't search for facts. Describe the page you want to find.

| Searching for | Bad query | Good query |
|---------------|-----------|------------|
| Stutz clients | "Phil Stutz clients" | "personal blog post where someone thanks their therapist Phil Stutz" |
| pSEO tactics | "programmatic SEO" | "detailed technical guide to programmatic SEO written by someone who built successful pSEO sites" |
| Startup advice | "startup advice" | "blog post by experienced founder sharing lessons from building and selling a startup" |

**Why this works:** The embedding of "personal blog post where someone thanks their therapist" is closer to actual testimonial pages than the embedding of "clients."

```
web_search_exa {
  "query": "personal blog post where someone thanks their therapist Phil Stutz",
  "numResults": 25
}
```

## Strategy 2: Long, Specific Queries

More words = more semantic signal.

```
// Short (worse)
web_search_exa { "query": "AI startups", "numResults": 20 }

// Long (better) - describes exactly what we want
web_search_exa {
  "query": "early-stage B2B SaaS startups using AI for sales automation founded recently with seed funding",
  "numResults": 20
}
```

**Why this works:** More descriptive words constrain the embedding space to more relevant regions.

## Strategy 3: Multiple Phrasings

Word order affects embeddings. Try variations across agents:

```
// Phrasing A
web_search_exa { "query": "Python async patterns for web scraping", "numResults": 20 }

// Phrasing B - different word order, different results
web_search_exa { "query": "web scraping async patterns in Python", "numResults": 20 }

// Phrasing C - different framing
web_search_exa { "query": "how to scrape websites asynchronously with Python", "numResults": 20 }
```

**Why this works:** Each phrasing produces a different embedding vector, which may be closer to different relevant pages. Run variations in parallel via agents.

## Strategy 4: Term Density

Packing many related terms can work well for exploratory queries:

```
web_search_exa {
  "query": "blog post cold email outbound sales B2B startup head of growth tactics templates examples",
  "numResults": 25
}
```

**Why this works:** The embedding captures the "vibe" of the term cluster, even if no single page contains all terms.

**Caveat:** Experimental. May work better for some topics than others.

## Strategy 5: Category Constraints

Use `category:<type>` inline in the query string for structural filtering:

```
// People search (LinkedIn profiles)
web_search_exa {
  "query": "category:people VP Engineering AI infrastructure",
  "numResults": 25
}

// Company search
web_search_exa {
  "query": "category:company programmatic SEO tools",
  "numResults": 25
}
```

**Available inline categories:** `people`, `company`, `research paper`, `news`, `personal site`

```
// Research papers
web_search_exa {
  "query": "category:research paper transformer attention mechanism efficiency",
  "numResults": 20
}

// News
web_search_exa {
  "query": "category:news AI startup funding announcement",
  "numResults": 20
}

// Personal sites/blogs
web_search_exa {
  "query": "category:personal site building production LLM applications lessons learned",
  "numResults": 20
}
```

## Anti-Patterns

**Don't try boolean logic:**
```
// "AND" and "NOT" are just words to Exa, not operators
web_search_exa { "query": "Phil Stutz AND client" }    // doesn't work as expected
web_search_exa { "query": "AI NOT hype" }               // doesn't work as expected
```

**Don't expect exact matching:**
```
// Quotes don't force exact phrase matching
web_search_exa { "query": "\"exact phrase matching\"" }  // won't force exact match
```

**Don't use very short queries for deep research:**
```
// Too vague, results will be scattered
web_search_exa { "query": "AI" }
```

## Validation Layer

Exa returns similarity, not validation. Always:

1. Review titles/snippets from results
2. Discard irrelevant results (cheap — LLM tokens)
3. Don't assume all results match your criteria
4. Use your judgment, not more searches, to filter
5. For promising results, use `web_fetch_exa` to read full content

## Experimentation

Query strategies are hypotheses. To improve:

1. Try a strategy on test cases
2. Measure result quality
3. Document what works for different topics
4. Combine strategies (long + term-dense, page-description + category)
