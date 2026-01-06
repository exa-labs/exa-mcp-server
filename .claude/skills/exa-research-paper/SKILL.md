---
name: exa-research-paper
description: Academic and scientific research using Exa. Use when finding research papers, academic citations, scientific studies, or technical documentation. Leverages research paper category with highlights and summaries for efficient literature review.
---

# Academic Research with Exa

## When to Use

- Literature review (e.g., "Find papers on transformer architectures")
- Finding citations (e.g., "Papers that cite Attention Is All You Need")
- Technical deep dives (e.g., "How does RLHF work?")
- State of the art (e.g., "Latest research in protein folding")

## Required Tools

Enable these tools in your Exa MCP config:
- `web_search_advanced` - Research paper category + PDF support
- `answer_exa` - Direct answers with academic citations
- `crawl_urls_exa` - Extract full paper content
- `find_similar_exa` - Find related papers

## Research Workflows

### 1. Find Papers on a Topic

```typescript
{
  query: "transformer attention mechanisms efficient inference",
  category: "research paper",
  numResults: 20,
  includeDomains: ["arxiv.org", "openreview.net", "aclanthology.org"],
  startPublishedDate: "2023-01-01",
  enableSummary: true,
  summaryQuery: "method, results, contribution"
}
```

### 2. Find Seminal Papers

Search without date filter for foundational work:

```typescript
{
  query: "attention is all you need transformer original paper",
  category: "research paper",
  numResults: 10
}
```

### 3. Find Related Papers

From a paper you like:

```typescript
{
  url: "https://arxiv.org/abs/1706.03762",
  category: "research paper",
  numResults: 30
}
```

### 4. Get Quick Answers

Use `answer_exa` for factual questions:

```typescript
{
  query: "What is the computational complexity of self-attention?",
  category: "research paper",
  numResults: 5
}
```

### 5. Extract Paper Content

Crawl for full text:

```typescript
{
  urls: ["https://arxiv.org/abs/2301.00234"],
  textMaxCharacters: 20000,
  enableSummary: true,
  enableHighlights: true,
  highlightsPerUrl: 10,
  highlightsQuery: "key findings contributions results"
}
```

## Advanced Searches

### By Conference/Venue

```typescript
{
  query: "NeurIPS 2024 language models",
  category: "research paper",
  includeDomains: ["neurips.cc", "openreview.net"],
  startPublishedDate: "2024-01-01"
}
```

### By Institution

```typescript
{
  query: "Google DeepMind reinforcement learning",
  category: "research paper",
  startPublishedDate: "2024-01-01",
  numResults: 20
}
```

### Technical Documentation

```typescript
{
  query: "PyTorch distributed training API",
  category: "pdf",
  includeDomains: ["pytorch.org", "github.com"],
  enableHighlights: true
}
```

### GitHub Implementations

```typescript
{
  query: "flash attention implementation CUDA",
  category: "github",
  numResults: 15
}
```

## Pro Tips

1. **Use research paper category** - Filters to academic sources
2. **Domain whitelist** - arxiv.org, openreview.net, aclanthology.org, neurips.cc
3. **Date ranges** - Recent for SOTA, no filter for foundational
4. **Summaries** - Use summaryQuery: "method, results, limitations"
5. **Highlights for scanning** - Key findings without reading full paper
6. **Find similar** - One good paper leads to related work

## Literature Review Template

```markdown
# Literature Review: [Topic]

## Overview
[Summary of the field]

## Key Papers

### [Paper Title 1]
- Authors: [Names]
- Year: [Year]
- Venue: [Conference/Journal]
- Key contribution: [Summary]
- URL: [arXiv/DOI]

### [Paper Title 2]
...

## State of the Art
[Current best approaches]

## Open Problems
[Gaps in research]

## Trends
[Direction the field is moving]

## References
[Full citation list]
```

## Example: Quick Paper Summary

```markdown
# Paper Summary

**Title:** [Title]
**Authors:** [Names]
**Year:** [Year]

## Problem
What problem does this paper solve?

## Method
How do they solve it?

## Results
What did they achieve?

## Limitations
What are the caveats?

## Key Quotes
> "[Important quote]" (p. X)

## Related Work
- [Paper 1]
- [Paper 2]
```
