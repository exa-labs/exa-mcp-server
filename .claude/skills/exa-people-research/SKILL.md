---
name: exa-people-research
description: Research individuals using Exa. Use when finding information about a person, their background, work history, or public presence. Combines linkedin_search_exa with web_search_advanced for comprehensive people research.
---

# People Research with Exa

## When to Use

- Finding someone's background (e.g., "Who is Sam Altman?")
- Pre-meeting research (e.g., "Research the CEO of Company X")
- Finding experts (e.g., "Find AI researchers at Stanford")
- Contact discovery (e.g., "Find the VP of Engineering at Stripe")

## Required Tools

Enable these tools in your Exa MCP config:
- `linkedin_search_exa` - LinkedIn profile search
- `web_search_advanced` - Full API for people category
- `crawling_exa` - Extract content from personal sites

## Workflow

### 1. LinkedIn Profile Search

Use `linkedin_search_exa`:

```typescript
{
  query: "Sam Altman OpenAI CEO",
  numResults: 5
}
```

### 2. People Category Search

Use `web_search_advanced` with people category:

```typescript
{
  query: "Sam Altman background career history",
  category: "people",
  numResults: 10,
  enableSummary: true
}
```

### 3. Personal Sites & Blogs

Search personal content:

```typescript
{
  query: "Sam Altman",
  category: "personal site",
  numResults: 10,
  includeDomains: ["substack.com", "medium.com", "github.com"],
  enableHighlights: true
}
```

### 4. Twitter/X Presence

Find social presence:

```typescript
{
  query: "Sam Altman",
  category: "tweet",
  numResults: 20,
  startPublishedDate: "2024-01-01"
}
```

### 5. News Mentions

Find press coverage:

```typescript
{
  query: "Sam Altman",
  category: "news",
  startPublishedDate: "2024-06-01",
  numResults: 15
}
```

### 6. Extract Personal Site

If they have a personal site, crawl it:

```typescript
{
  url: "https://samaltman.com",
  textMaxCharacters: 10000,
  subpages: 5,
  subpageTarget: ["about", "bio", "writing"]
}
```

## Finding People at Companies

### Find Executives

```typescript
{
  query: "Anthropic executives leadership team",
  category: "people",
  includeDomains: ["linkedin.com", "anthropic.com"],
  numResults: 20
}
```

### Find by Role

```typescript
{
  query: "VP Engineering Stripe",
  category: "people",
  numResults: 10
}
```

## Pro Tips

1. **Combine categories** - LinkedIn for career, personal sites for personality, news for recent activity
2. **Use subpage crawling** - Personal sites often have about/bio pages
3. **Date filter for recency** - Filter news to last 6 months for current role
4. **Domain targeting** - linkedin.com, twitter.com, personal domains
5. **Highlight quotes** - Enable highlights to find direct quotes

## Example Output Structure

```markdown
# Person Profile: [Name]

## Current Role
[Title] at [Company] (since [Year])

## Background
- Education: [Degrees, Schools]
- Previous roles: [List]
- Known for: [Achievements]

## Online Presence
- LinkedIn: [URL]
- Twitter: [URL]
- Personal site: [URL]

## Recent Activity
- [Date]: [Event/Quote/News]

## Public Quotes
> "[Quote]" - [Source]

## Sources
[List of URLs used]
```
