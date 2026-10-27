# Query Patterns: Companies

Use `category:company` for structured company data (funding, headcount, description).

```
// By category
web_search_exa { "query": "category:company AI infrastructure startups San Francisco", "numResults": 10 }

// By stage
web_search_exa { "query": "category:company Series B fintech payments", "numResults": 10 }

// Similar to known company
web_search_exa { "query": "category:company companies like Stripe", "numResults": 8 }
```

For competitive intelligence, layer multiple angles:
```
web_search_exa { "query": "category:company companies like [target]", "numResults": 10 }
web_search_exa { "query": "category:company [category] software tools", "numResults": 15 }
web_search_exa { "query": "[category] startup launch funding announcement recently", "numResults": 15 }
```

For funding/investors:
```
web_search_exa { "query": "[company] funding round raised investors", "numResults": 5 }
web_search_exa { "query": "category:company [company]", "numResults": 5 }
```
