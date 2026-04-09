
# Code & Documentation Search

Use `web_search_exa` to find code examples, API documentation, and developer resources. Use `web_fetch_exa` to read documentation pages in full.

## Query Strategy

Describe the code or documentation you want to find. Always include the **programming language** and **framework/library** to reduce cross-language noise.

```
web_search_exa {
  "query": "[language] [library] [specific method or pattern] documentation example",
  "numResults": 20
}
```

## Query Patterns

### API Usage

```
// Specific method
web_search_exa {
  "query": "Stripe API create subscription Node.js code example",
  "numResults": 15
}

// Full API coverage
web_search_exa {
  "query": "Stripe subscription lifecycle management documentation guide",
  "numResults": 15
}

// Integration pattern
web_search_exa {
  "query": "Stripe webhook handling Node.js implementation pattern",
  "numResults": 15
}
```

### Library Documentation

```
// Basic usage
web_search_exa {
  "query": "React Query useQuery basic usage example TypeScript",
  "numResults": 15
}

// Advanced patterns
web_search_exa {
  "query": "React Query cache invalidation strategies guide",
  "numResults": 15
}
```

### Error Resolution

```
// Specific error
web_search_exa {
  "query": "TypeError cannot read property undefined React fix solution",
  "numResults": 15
}

// Error pattern
web_search_exa {
  "query": "React hydration mismatch server client explanation fix",
  "numResults": 15
}
```

### Framework Patterns

```
// Design pattern
web_search_exa {
  "query": "Next.js 14 App Router data fetching patterns guide",
  "numResults": 15
}

// Best practices
web_search_exa {
  "query": "Next.js authentication best practices implementation guide",
  "numResults": 15
}
```

## Deep Reading Documentation

After finding relevant pages, use `web_fetch_exa` for full content:

```
web_fetch_exa {
  "urls": ["https://docs.stripe.com/api/subscriptions", "https://nextjs.org/docs/app/building-your-application/data-fetching"],
  "maxCharacters": 5000
}
```

## When to Use Search vs Fetch

| Scenario | Use |
|----------|-----|
| Don't know where docs are | `web_search_exa` to discover |
| Know the URL, need content | `web_fetch_exa` to read |
| Need code snippets from unknown sources | `web_search_exa` |
| Need to read a specific doc page | `web_fetch_exa` |
| Need multiple examples from different sources | `web_search_exa` then `web_fetch_exa` on best |

## GitHub Examples

```
// Find real implementations
web_search_exa {
  "query": "GitHub repository Stripe subscription Next.js example starter",
  "numResults": 15
}

// Popular repos using a library
web_search_exa {
  "query": "GitHub [library] example project open source",
  "numResults": 20
}
```

## Stack Overflow Solutions

```
web_search_exa {
  "query": "[error or problem] solution StackOverflow accepted answer",
  "numResults": 15
}
```

## Query Refinement Tips

**Results too generic?** Make query more specific:
- Bad: `"React hooks"` → Good: `"React useEffect cleanup function async pattern"`

**Wrong library version?** Add version hint:
- `"Next.js 14 App Router server actions"` not just `"Next.js server actions"`

**Missing context?** Try multiple queries or fetch the official docs directly.

## Output Format

Return:
1) Best minimal working snippet(s) — keep it copy/paste friendly
2) Notes on version / constraints / gotchas
3) Sources (URLs)

Before presenting:
- Deduplicate similar results, keep only the best representative snippet per approach
