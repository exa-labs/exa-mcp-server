---
name: exa-company-research
description: Research companies comprehensively using Exa. Use when researching a company, finding competitors, analyzing financials, or gathering business intelligence. Combines web_search_advanced, company_research_exa, and crawling for thorough analysis.
---

# Company Research with Exa

## When to Use

- User asks about a company (e.g., "Research Stripe", "Tell me about OpenAI")
- Competitive analysis (e.g., "Who competes with Figma?")
- Financial research (e.g., "How is Anthropic funded?")
- Company discovery (e.g., "Find AI startups in healthcare")

## Required Tools

Enable these tools in your Exa MCP config:
- `web_search_advanced` - Full API control for category/domain filtering
- `company_research_exa` - Company-specific research
- `crawling_exa` - Extract content from company pages

## Workflow

### 1. Initial Company Search

Use `web_search_advanced` with company category:

```typescript
{
  query: "Stripe company overview funding valuation",
  category: "company",
  numResults: 10,
  includeDomains: ["crunchbase.com", "bloomberg.com", "techcrunch.com", "forbes.com"],
  enableSummary: true
}
```

### 2. Financial Data

Search financial sources:

```typescript
{
  query: "Stripe revenue valuation 2024",
  category: "financial report",
  includeDomains: ["sec.gov", "bloomberg.com", "reuters.com", "wsj.com"],
  startPublishedDate: "2024-01-01"
}
```

### 3. News & Press

Get recent news:

```typescript
{
  query: "Stripe",
  category: "news",
  startPublishedDate: "2024-06-01",
  numResults: 15,
  enableHighlights: true,
  highlightsPerUrl: 3
}
```

### 4. Find Competitors

Use `find_similar_exa`:

```typescript
{
  url: "https://stripe.com",
  category: "company",
  numResults: 20,
  excludeSourceDomain: true
}
```

### 5. Deep Dive on Specific Pages

Use `crawling_exa` for company pages:

```typescript
{
  url: "https://stripe.com/about",
  textMaxCharacters: 5000,
  summary: true
}
```

## Pro Tips

1. **Layer your searches** - Start broad (company category), then narrow (financial reports, news)
2. **Use date filters** - Recent news + historical for trends
3. **Domain whitelists** - Trusted sources: crunchbase.com, pitchbook.com, bloomberg.com
4. **Highlights for scanning** - Enable highlights when processing many results
5. **Summaries for synthesis** - Use summaryQuery to focus on specific aspects

## Example Output Structure

```markdown
# Company Research: [Company Name]

## Overview
[Summary from company pages and Crunchbase]

## Funding & Financials
- Total raised: $X
- Valuation: $X
- Recent rounds: [details]

## Competitors
1. [Competitor 1] - [brief comparison]
2. [Competitor 2] - [brief comparison]

## Recent News
- [Date]: [Headline] - [Summary]

## Key People
- CEO: [Name]
- Founded: [Year]

## Sources
[List of URLs used]
```
