
# Verification & Completeness Checks

Use these checks after your main search to verify you haven't missed important content.

## When to Verify

- After any "deep" or "comprehensive" search
- Before reporting "exhaustive" results
- When user can't afford to miss things
- When results seem suspiciously sparse

## Check Types

### 1. Cross-Reference Check

Take your best 2-3 results and find related content:

```
// What's related to our best results? Might find things we missed.
web_search_exa {
  "query": "similar to [title/topic of best result] [key terms]",
  "numResults": 15
}

// Deep read best results for links and references
web_fetch_exa {
  "urls": ["https://best-result-url-1", "https://best-result-url-2"],
  "maxCharacters": 5000
}
```

**If this finds significant new content:** Your original search missed an angle. Go back and search that angle directly.

### 2. Contrarian Check

Search for criticism, alternatives, and opposing views:

```
web_search_exa {
  "query": "[topic] overrated criticism problems limitations",
  "numResults": 15
}

web_search_exa {
  "query": "[topic] alternatives better than comparison",
  "numResults": 15
}
```

**If this finds substantive criticism:** Include it in your synthesis. Balanced research includes opposing views.

### 3. Recency Check

Make sure you haven't missed recent developments:

```
web_search_exa {
  "query": "[topic] recent news update latest development announcement",
  "numResults": 20
}
```

**If this finds major recent content:** Your results may be outdated. Prioritize recent findings for fast-moving topics.

### 4. Source Diversity Check

Review your results for source concentration:

**Questions to ask:**
- Are most results from the same domain/source?
- Are you missing major content types? (personal blogs, news, company pages)
- Are you missing geographic diversity if relevant?

**If too concentrated:**
```
// Force different source types
web_search_exa {
  "query": "[topic] personal blog experience practitioner perspective",
  "numResults": 20
}

web_search_exa {
  "query": "[topic] news analysis report",
  "numResults": 20
}
```

### 5. High-Signal Source Validation

If you identified high-signal sources, verify you searched their content:

```
// Did we search each source's content?
web_search_exa { "query": "[source 1 name] [topic]", "numResults": 15 }
web_search_exa { "query": "[source 2 name] [topic]", "numResults": 15 }
```

### 6. Temporal Window Check

For event-based searches, verify temporal coverage:

```
// Did we cover all relevant time windows?
web_search_exa {
  "query": "[topic] [key event] reaction analysis",
  "numResults": 20
}
```

## Verification Workflow

1. Complete main search
2. Run cross-reference check (always)
3. Run contrarian check (for research/best-practices queries)
4. Run recency check (for fast-moving topics)
5. Review source diversity
6. If gaps found, run targeted searches
7. Document what you verified

## Reporting Verification

When reporting results, note:

```markdown
## Coverage Verification
- Cross-reference: Checked related content for top 3 results, found N additional sources
- Contrarian: Searched criticism, found [substantive concerns / nothing notable]
- Recency: Checked recent content, topic [unchanged / has new developments]
- Sources: Results span [content types covered]
```

## Quick Verification (for faster searches)

When you don't have time for full verification:

```
web_search_exa {
  "query": "[topic] [different phrasing than original search]",
  "numResults": 10
}
```

If this returns mostly duplicates of what you found, coverage is likely good.
