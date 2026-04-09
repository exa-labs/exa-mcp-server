
# Finding People

Use `web_search_exa` with `category:people` in the query for LinkedIn-based searches. Supplement with general searches for broader coverage.

## Primary Approach

```
web_search_exa {
  "query": "category:people [role/name/description]",
  "numResults": 25
}
```

**Restrictions when using `category:people`:**
- No date filtering available (encode recency in query text if needed)
- No domain exclusion
- Results are LinkedIn-profile-weighted

## Query Patterns

### By Company

```
// Basic - gets top results, often leadership
web_search_exa { "query": "category:people works at OpenAI", "numResults": 30 }

// By department
web_search_exa { "query": "category:people engineer at OpenAI", "numResults": 25 }
web_search_exa { "query": "category:people product manager at OpenAI", "numResults": 25 }
web_search_exa { "query": "category:people researcher at OpenAI", "numResults": 25 }

// By seniority
web_search_exa { "query": "category:people senior engineer at OpenAI", "numResults": 20 }
web_search_exa { "query": "category:people VP director at OpenAI", "numResults": 15 }
```

### By Role + Location

```
web_search_exa { "query": "category:people VP of Engineering San Francisco", "numResults": 25 }
web_search_exa { "query": "category:people Head of Growth B2B SaaS startup", "numResults": 30 }
```

### Finding Specific People

```
// Name + company
web_search_exa { "query": "category:people John Smith Anthropic", "numResults": 10 }

// Name + role (disambiguates common names)
web_search_exa { "query": "category:people Sarah Chen machine learning researcher", "numResults": 10 }
```

## Comprehensive Company Coverage

For "find all employees at X", use waves via parallel agents:

**Wave 1 — Departments:**
```
web_search_exa { "query": "category:people engineering at Cursor", "numResults": 40 }
web_search_exa { "query": "category:people product design at Cursor", "numResults": 25 }
web_search_exa { "query": "category:people sales marketing at Cursor", "numResults": 25 }
web_search_exa { "query": "category:people operations at Cursor", "numResults": 20 }
```

**Wave 2 — Seniorities:**
```
web_search_exa { "query": "category:people senior staff principal at Cursor", "numResults": 25 }
web_search_exa { "query": "category:people manager director at Cursor", "numResults": 25 }
web_search_exa { "query": "category:people VP head of at Cursor", "numResults": 20 }
```

**Wave 3 — Supplemental (beyond LinkedIn):**
```
// Team pages
web_search_exa { "query": "Cursor team page employees about us", "numResults": 15 }

// News mentions of hires
web_search_exa { "query": "joined Cursor recently hired new role announcement", "numResults": 20 }

// Deep read team pages for names LinkedIn misses
web_fetch_exa { "urls": ["https://cursor.com/about"] }
```

## Deduplication

LinkedIn search often returns same person multiple ways. Track by:
- LinkedIn URL (canonical identifier)
- Name + current company (fallback)

## Dynamic Tuning

No hardcoded numResults. Tune to user intent:
- User says "a few" → 10-20
- User says "comprehensive" → 50-100
- User specifies number → match it
- Ambiguous? Ask: "How many profiles would you like?"

## Query Variation

Exa returns different results for different phrasings. For coverage:
- Generate 2-3 query variations per search intent
- Run in parallel via agents
- Merge and deduplicate

## Finding Investors/Advisors

```
web_search_exa { "query": "category:people investor at Sequoia Capital", "numResults": 25 }
web_search_exa { "query": "category:people partner at Andreessen Horowitz", "numResults": 25 }
web_search_exa { "query": "category:people advisor to [company]", "numResults": 20 }
```
