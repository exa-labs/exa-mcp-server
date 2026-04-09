
# Deep Search Pattern

Use this when quality and completeness both matter. The goal: don't miss anything important.

## The Flow

### Phase 1: Subject's Own Platforms

Before indirect searches, check if the subject has their own content:
- Website with testimonials, case studies, team pages
- Podcast (episode titles list guests)
- Blog with interviews or guest posts

```
// Search for subject's own content
web_search_exa { "query": "[subject] official website blog podcast", "numResults": 15 }

// Deep read their site for names and content others miss
web_fetch_exa { "urls": ["https://subject-website.com/blog", "https://subject-website.com/about"] }
```

One scrape of the subject's own site can find names that would take 20 indirect queries to rediscover.

### Phase 2: Cover the Obvious

Before getting clever, run the direct query:

```
web_search_exa { "query": "[topic] [direct question]", "numResults": 25 }
```

This covers pages that explicitly discuss what you're looking for. Sometimes the answer is right there.

### Phase 3: Scout the Landscape

Spawn an agent to understand what's out there:

```
Agent prompt:
"Scout the landscape for [topic]. Run these fast searches:
1. web_search_exa { "query": "[topic]", "numResults": 15 }
2. web_search_exa { "query": "[topic] news recent", "numResults": 10 }
3. web_search_exa { "query": "[topic] analysis deep dive", "numResults": 10 }
Return: content types found, notable sources, key events/dates"
```

Use scout findings to refine your approach.

### Phase 4: Find Signal (if applicable)

For best practices, tactics, or expert-finding queries, read `finding-signal.md` first.

Find who the high-signal sources are BEFORE searching broadly. A few insights from arbiters beats 100 results from noise.

### Phase 5: Plan Your Queries

Based on scouting and signal identification, write exact queries. Consider:

1. **Content types to hit:**
   - Personal blogs/pages (tributes, testimonials)
   - News (profiles, interviews)
   - Company pages (case studies, teams)
   - Academic (papers, research)

2. **Multiple phrasings:**
   - Word order affects embedding similarity
   - Try 2-3 variations of important queries

3. **Category-specific:**
   - `category:people` for profile searches
   - `category:company` for company searches
   - Descriptive queries for everything else

### Phase 6: Execute via Agents

Spawn agents with exact queries:

```
Agent prompt:
"Run these exact queries:
1. web_search_exa { "query": "personal blog thanking [subject] for changing my life", "numResults": 25 }
2. web_search_exa { "query": "[subject] documentary personal reaction story", "numResults": 25 }
3. web_search_exa { "query": "[subject] interview in-depth profile", "numResults": 25 }
Return: title, url, snippet for each"
```

**Agent sizing:**
- 3-5 queries per agent
- More queries = more agents, not bigger agents
- Parallelize aggressively

### Phase 7: Validate with Reasoning

Exa returns vector-similar results. Many won't be relevant.

Use your judgment (cheap LLM tokens) to:
- Scan titles/snippets
- Discard irrelevant results
- Identify promising leads for deeper reading
- Note gaps: "Found X but nothing about Y"

### Phase 8: Go Deeper (if needed)

If gaps remain or leads emerged:

```
// Deep read promising URLs for full content
web_fetch_exa {
  "urls": ["https://promising-url-1.com", "https://promising-url-2.com"],
  "maxCharacters": 5000
}
```

Or spawn an agent to read multiple URLs and extract specific information.

### Phase 9: Completeness Check

Before reporting, verify coverage (see `verification.md`):
- Cross-reference: search for content similar to best results
- Contrarian: search for criticism/alternatives
- Recency: anything new recently?
- If gap found, one targeted follow-up query
