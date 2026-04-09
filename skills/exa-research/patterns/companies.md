
# Company Research

Use `web_search_exa` with `category:company` in the query for structured company data. Supplement with general searches for deeper intelligence.

## Primary Approach

```
web_search_exa {
  "query": "category:company [description]",
  "numResults": 25
}
```

**Restrictions when using `category:company`:**
- No date filtering (encode recency in query text)
- No domain include/exclude
- Returns company metadata (funding, headcount, description)

## Query Patterns

### Find Similar Companies

```
// Semantic matching to known company
web_search_exa { "query": "category:company companies like Stripe", "numResults": 25 }

// By category + stage
web_search_exa { "query": "category:company Series B fintech payments", "numResults": 30 }

// By category + geography
web_search_exa { "query": "category:company AI infrastructure startups San Francisco", "numResults": 30 }
```

### Find by Category

```
// Broad category
web_search_exa { "query": "category:company programmatic SEO tools", "numResults": 25 }

// Specific niche
web_search_exa { "query": "category:company AI writing tools for SEO content", "numResults": 25 }

// Emerging category
web_search_exa { "query": "category:company AI agents for sales early stage", "numResults": 30 }
```

### Find by Stage

```
// Early stage
web_search_exa { "query": "category:company seed stage AI startups", "numResults": 30 }

// Growth stage
web_search_exa { "query": "category:company Series B C AI companies", "numResults": 30 }

// By headcount
web_search_exa { "query": "category:company AI startups 50-200 employees", "numResults": 25 }
```

## Competitive Intelligence

### Map a Market

```
// Step 1: Direct competitors
web_search_exa { "query": "category:company companies like [target]", "numResults": 30 }

// Step 2: Category players
web_search_exa { "query": "category:company [category] software tools", "numResults": 40 }

// Step 3: By problem solved
web_search_exa { "query": "category:company tools for [problem target solves]", "numResults": 30 }

// Step 4: News for recent entrants
web_search_exa { "query": "[category] startup launch funding announcement recently", "numResults": 30 }
```

### Find Customers

Customer lists are rarely public. Search indirectly:

```
// Case studies
web_search_exa { "query": "[company] case study customer success story", "numResults": 25 }

// Integration pages
web_search_exa { "query": "[company] integrations partners", "numResults": 20 }

// Press releases
web_search_exa { "query": "[company] customer partnership announcement", "numResults": 20 }

// Deep read case study pages
web_fetch_exa { "urls": ["https://company.com/customers"] }
```

### Find Investors/Funding

```
// Funding announcements
web_search_exa { "query": "[company] funding round raised investors", "numResults": 20 }

// Company metadata (funding included)
web_search_exa { "query": "category:company [company]", "numResults": 5 }

// Investor portfolio pages
web_search_exa { "query": "[VC firm] portfolio companies", "numResults": 20 }
```

## Market Mapping

### Landscape a Category

```
// Broad search
web_search_exa { "query": "category:company [category]", "numResults": 50 }

// Subcategory breakdown
web_search_exa { "query": "category:company [category] for enterprise", "numResults": 25 }
web_search_exa { "query": "category:company [category] for SMB", "numResults": 25 }
web_search_exa { "query": "category:company [category] open source", "numResults": 25 }

// Geographic breakdown
web_search_exa { "query": "category:company [category] Europe", "numResults": 25 }
web_search_exa { "query": "category:company [category] Asia", "numResults": 25 }
```

## Dynamic Tuning

No hardcoded numResults. Tune to user intent:
- User says "a few" → 10-20
- User says "comprehensive" → 50-100
- User specifies number → match it
- Ambiguous? Ask: "How many companies would you like?"

## Supplementing Company Search

Beyond `category:company`:

```
// Product Hunt for consumer/prosumer
web_search_exa { "query": "[category] Product Hunt launch", "numResults": 25 }

// YC companies
web_search_exa { "query": "Y Combinator [category] startup", "numResults": 25 }

// Deep read company pages
web_fetch_exa { "urls": ["https://company.com/about", "https://company.com/pricing"] }
```

## Output Format

Return:
1) Results (structured list; one company per row with name, stage, funding, description)
2) Sources (URLs; 1-line relevance each)
3) Notes (uncertainty/conflicts, gaps in coverage)
