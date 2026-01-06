---
name: exa-gtm
description: Sales and GTM research workflows using Exa. Use when prospecting, building account lists, preparing for sales calls, or researching potential customers. Combines company research with people finding for sales intelligence.
---

# GTM & Sales Research with Exa

## When to Use

- Building prospect lists (e.g., "Find fintech startups in NYC")
- Account research (e.g., "Research Acme Corp before my call")
- Finding decision makers (e.g., "Who should I contact at Stripe?")
- Competitive intel (e.g., "What are Stripe's customers saying?")

## Required Tools

Enable these tools in your Exa MCP config:
- `web_search_advanced` - Full API for company/people search
- `linkedin_search_exa` - Find decision makers
- `company_research_exa` - Company intel
- `crawling_exa` - Extract detailed info

## Prospecting Workflows

### 1. Build Target Account List

Find companies matching your ICP:

```typescript
{
  query: "Series B fintech startup payments infrastructure",
  category: "company",
  numResults: 30,
  includeDomains: ["crunchbase.com", "techcrunch.com"],
  startPublishedDate: "2023-01-01",
  enableSummary: true,
  summaryQuery: "funding, product, team size"
}
```

### 2. Find Similar Companies

From a known good customer:

```typescript
{
  url: "https://goodcustomer.com",
  category: "company",
  numResults: 50,
  excludeSourceDomain: true
}
```

### 3. Find Decision Makers

Search for the right contacts:

```typescript
{
  query: "VP Engineering Head of Platform Stripe",
  category: "people",
  includeDomains: ["linkedin.com"],
  numResults: 20
}
```

## Pre-Call Research

### 1. Company Overview

```typescript
{
  query: "Acme Corp company overview product funding",
  category: "company",
  numResults: 10,
  enableSummary: true
}
```

### 2. Recent News

```typescript
{
  query: "Acme Corp",
  category: "news",
  startPublishedDate: "2024-01-01",
  numResults: 10,
  enableHighlights: true
}
```

### 3. Tech Stack

```typescript
{
  query: "Acme Corp technology stack engineering blog",
  includeDomains: ["stackshare.io", "builtwith.com", "github.com"],
  numResults: 10
}
```

### 4. Key People

```typescript
{
  query: "Acme Corp executives leadership CTO VP Engineering",
  category: "people",
  numResults: 15
}
```

### 5. Pain Points

Search for challenges:

```typescript
{
  query: "Acme Corp challenges problems scaling",
  category: "news",
  startPublishedDate: "2023-01-01",
  enableHighlights: true,
  highlightsQuery: "challenges problems pain points"
}
```

## Competitive Intelligence

### Customer Sentiment

```typescript
{
  query: "competitor-name review customer feedback",
  excludeDomains: ["competitor-name.com"],
  category: "personal site",
  enableHighlights: true,
  highlightsQuery: "pros cons issues"
}
```

### Product Comparisons

```typescript
{
  query: "competitor-name vs alternative comparison",
  category: "news",
  numResults: 20
}
```

## Pro Tips

1. **Layer searches** - Company first, then people, then news
2. **Use date filters** - Recent news shows current state
3. **Highlight pain points** - Use highlightsQuery for challenges
4. **Batch similar companies** - Use find_similar for ICP expansion
5. **Tech stack research** - GitHub, StackShare reveal infrastructure

## Example Output: Pre-Call Brief

```markdown
# Account Brief: [Company Name]

## Quick Facts
- Founded: [Year]
- Funding: [Total raised, Last round]
- Size: [Employee count]
- HQ: [Location]

## What They Do
[2-3 sentence summary]

## Recent News
- [Date]: [Headline + key point]
- [Date]: [Headline + key point]

## Key Contacts
- [Name], [Title] - [LinkedIn URL]
- [Name], [Title] - [LinkedIn URL]

## Potential Pain Points
- [Challenge 1]
- [Challenge 2]

## Tech Stack
- [Known technologies]

## Talking Points
1. [Point based on their recent news]
2. [Point based on their industry]
3. [Point based on their tech stack]

## Sources
[URLs]
```
