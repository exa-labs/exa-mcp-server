# Query Patterns: Hidden Relationships

Finding connections that aren't explicitly listed anywhere. Direct queries ("X clients") return articles about them, not actual connections. Use indirect signals instead.

**Start with the subject's own platforms:**
```
web_search_exa { "query": "[subject] official website blog podcast", "numResults": 5 }
web_search_exa { "query": "[subject] conversation interview testimonial guest", "numResults": 8 }
web_fetch_exa { "urls": ["https://subject-website.com/blog", "https://subject-website.com/about"] }
```

**For B2B (company -> customers):**
```
web_search_exa { "query": "[company] case study customer success story", "numResults": 5 }
web_fetch_exa { "urls": ["https://company.com/customers", "https://company.com/case-studies"] }
```

**Indirect signal searches:**
```
// Testimonials
web_search_exa { "query": "personal blog [subject] changed my life testimonial", "numResults": 15 }

// Duration markers (high confidence -- people don't fabricate decades)
web_search_exa { "query": "[subject] years decades longtime worked with known since", "numResults": 10 }

// Terminology detection: find insider terms, then search for people using them
web_search_exa { "query": "[subject] method terminology concepts framework", "numResults": 5 }
web_search_exa { "query": "[unique term 1] [unique term 2] personal story", "numResults": 10 }
```
