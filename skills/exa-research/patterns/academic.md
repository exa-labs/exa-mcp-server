
# Academic Research

Exa has comprehensive coverage of research papers. Use `category:research paper` inline in the query to target Exa's paper index directly.

## Primary Approach

```
web_search_exa {
  "query": "category:research paper [topic description]",
  "numResults": 25
}
```

The `category:research paper` inline syntax searches Exa's dedicated paper index. For additional precision, include academic signal words:
- Author names, conference names (NeurIPS, ICML, ACL)
- Methodology terms specific to the field
- "survey", "preprint", "benchmark"

## Query Patterns

### By Topic

```
// Broad topic
web_search_exa {
  "query": "category:research paper transformer architecture improvements efficiency",
  "numResults": 30
}

// Specific technique
web_search_exa {
  "query": "category:research paper sparse attention mechanisms for long context transformers",
  "numResults": 25
}

// Problem-oriented
web_search_exa {
  "query": "category:research paper memory efficient inference for large language models",
  "numResults": 25
}
```

### By Author

```
web_search_exa {
  "query": "category:research paper Yoshua Bengio deep learning",
  "numResults": 25
}
```

### By Recency

Encode time in the query text:

```
web_search_exa {
  "query": "category:research paper large language model recent advances 2025 2026",
  "numResults": 30
}
```

### By Paper Characteristics

```
// Survey papers
web_search_exa {
  "query": "category:research paper [topic] comprehensive survey review",
  "numResults": 15
}

// Benchmark papers
web_search_exa {
  "query": "category:research paper [topic] benchmark evaluation dataset comparison",
  "numResults": 20
}

// Applied papers
web_search_exa {
  "query": "category:research paper [topic] practical implementation real-world application",
  "numResults": 25
}
```

## Finding Seminal Papers

```
// Step 1: Surveys cite foundational work
web_search_exa {
  "query": "category:research paper [topic] survey review foundational",
  "numResults": 10
}

// Step 2: Search for widely-cited papers
web_search_exa {
  "query": "category:research paper [topic] seminal influential widely cited",
  "numResults": 20
}

// Step 3: Deep read the survey to extract references
web_fetch_exa { "urls": ["https://arxiv.org/abs/survey-paper-id"] }
```

## Author Discovery

Find key researchers in a field:

```
// Step 1: Search papers, note recurring authors
web_search_exa { "query": "category:research paper [topic]", "numResults": 50 }

// Step 2: Search for researcher profiles
web_search_exa {
  "query": "[topic] researcher professor leading expert lab",
  "numResults": 20
}

// Step 3: Check specific author's work
web_search_exa { "query": "[author name] research papers publications", "numResults": 25 }
```

## Research Group Discovery

```
// Lab/group pages
web_search_exa {
  "query": "[topic] research lab group university professor",
  "numResults": 25
}

// PhD students' blogs (often more accessible)
web_search_exa {
  "query": "[topic] PhD student research blog experience",
  "numResults": 20
}
```

## Supplementing Paper Search

```
// Blog posts explaining papers
web_search_exa {
  "query": "[paper title] explained blog summary accessible",
  "numResults": 15
}

// Code implementations
web_search_exa {
  "query": "[paper title] implementation GitHub code repository",
  "numResults": 15
}

// Deep read paper abstracts
web_fetch_exa { "urls": ["https://arxiv.org/abs/paper-id"] }
```

## Cross-Referencing

```
// Papers building on a specific work
web_search_exa {
  "query": "building on [paper title] extending improving upon",
  "numResults": 20
}
```

## Output Format

Return:
1) Results (title, authors, date, abstract summary, venue)
2) Sources (URLs with publication venue)
3) Notes (methodology differences, conflicting findings, gaps)
