# Query Patterns: Research Papers

Use `category:research paper` for Exa's paper index.

```
// By topic
web_search_exa { "query": "category:research paper sparse attention mechanisms for long context transformers", "numResults": 12 }

// Survey/review papers
web_search_exa { "query": "category:research paper [topic] comprehensive survey review", "numResults": 10 }

// By author
web_search_exa { "query": "category:research paper [author name] [topic]", "numResults": 5 }

// By recency (encode time in query)
web_search_exa { "query": "category:research paper large language model advances 2025 2026", "numResults": 15 }
```

To find seminal papers: search for survey papers first, then deep-read them to extract foundational references.
