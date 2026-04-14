# Query Patterns: People

Use `category:people` for LinkedIn-weighted results. For discovery queries, be specific -- vague queries like `"category:people researcher founder CEO startup"` will match many irrelevant LinkedIn profiles. Include specific companies, timeframes, or roles to narrow results.

```
// By company + role
web_search_exa { "query": "category:people engineer at OpenAI", "numResults": 10 }
web_search_exa { "query": "category:people VP director at Cursor", "numResults": 10 }

// By role + location
web_search_exa { "query": "category:people Head of Growth B2B SaaS startup San Francisco", "numResults": 12 }

// Specific person
web_search_exa { "query": "category:people Jane Smith Anthropic machine learning", "numResults": 5 }
```

For comprehensive company coverage, search by department and seniority in parallel:
```
web_search_exa { "query": "category:people engineering at Acme", "numResults": 10 }
web_search_exa { "query": "category:people product design at Acme", "numResults": 10 }
web_search_exa { "query": "category:people sales marketing at Acme", "numResults": 10 }
```

Supplement with non-LinkedIn sources:
```
web_search_exa { "query": "Acme team page employees about us", "numResults": 5 }
web_search_exa { "query": "joined Acme recently hired new role announcement", "numResults": 5 }
```

Deduplicate by LinkedIn URL (canonical) or name + current company (fallback).
