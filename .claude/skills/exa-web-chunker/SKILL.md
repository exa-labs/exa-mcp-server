---
name: exa-web-chunker
description: Advanced web content extraction and chunking using Exa. Use when you need to thoroughly extract content from websites, crawl multiple pages, or build comprehensive knowledge from web sources. Leverages subpages, highlights, and batch crawling for deep extraction.
---

# Web Content Extraction with Exa

## When to Use

- Documentation extraction (e.g., "Get all docs from React")
- Blog/article harvesting (e.g., "Get all posts from this blog")
- Site mapping (e.g., "What pages are on this site?")
- Content aggregation (e.g., "Gather info from these 10 URLs")

## Required Tools

Enable these tools in your Exa MCP config:
- `crawl_urls_exa` - Batch URL crawling with options
- `web_search_advanced` - Search + subpage crawling
- `crawling_exa` - Single URL extraction

## Extraction Workflows

### 1. Single Page Extraction

Basic content extraction:

```typescript
// Using crawl_urls_exa
{
  urls: ["https://example.com/docs/getting-started"],
  textMaxCharacters: 10000,
  enableSummary: true,
  enableHighlights: true,
  highlightsPerUrl: 5
}
```

### 2. Batch URL Processing

Process multiple known URLs:

```typescript
{
  urls: [
    "https://example.com/page1",
    "https://example.com/page2",
    "https://example.com/page3"
  ],
  textMaxCharacters: 5000,
  enableSummary: true,
  summaryQuery: "main points and key information",
  livecrawl: "always"
}
```

### 3. Subpage Crawling

Crawl a page plus its linked pages:

```typescript
// Using web_search_advanced or crawl_urls_exa
{
  urls: ["https://docs.example.com"],
  subpages: 10,
  subpageTarget: ["getting started", "tutorial", "guide", "api"],
  textMaxCharacters: 3000,
  enableSummary: true
}
```

### 4. Documentation Harvesting

Get all docs from a site:

```typescript
{
  query: "site:docs.react.dev tutorial guide",
  type: "auto",
  numResults: 50,
  includeDomains: ["docs.react.dev"],
  textMaxCharacters: 5000,
  enableHighlights: true,
  highlightsPerUrl: 5,
  highlightsQuery: "key concept important"
}
```

### 5. Blog Archive Extraction

Get blog posts:

```typescript
{
  query: "site:blog.example.com",
  type: "auto",
  numResults: 30,
  category: "personal site",
  startPublishedDate: "2024-01-01",
  enableSummary: true
}
```

## Advanced Patterns

### Link Extraction

Get URLs from a page:

```typescript
{
  urls: ["https://example.com/resources"],
  extractLinks: 50,
  textMaxCharacters: 1000
}
```

### Image Extraction

Get images:

```typescript
{
  urls: ["https://example.com/gallery"],
  extractImages: 20,
  textMaxCharacters: 500
}
```

### Live Crawl for Fresh Content

Force fresh crawl:

```typescript
{
  urls: ["https://news.example.com"],
  livecrawl: "always",
  livecrawlTimeout: 30000,
  textMaxCharacters: 5000
}
```

### Targeted Highlights

Extract specific information:

```typescript
{
  urls: ["https://example.com/pricing"],
  enableHighlights: true,
  highlightsPerUrl: 10,
  highlightsQuery: "price cost tier plan features",
  highlightsNumSentences: 2
}
```

## Chunking Strategies

### For Long Documents

```typescript
// Crawl with manageable chunks
{
  urls: ["https://example.com/long-doc"],
  textMaxCharacters: 3000,  // Smaller chunks
  enableHighlights: true,
  highlightsPerUrl: 10,
  enableSummary: true
}
```

### For Multiple Pages

```typescript
// Summary-first approach
{
  urls: [...arrayOf20Urls],
  textMaxCharacters: 1000,  // Brief per page
  enableSummary: true,
  summaryQuery: "main topic and key points"
}
```

## Pro Tips

1. **textMaxCharacters** - Adjust based on how many URLs (more URLs = smaller per URL)
2. **subpages** - Use for documentation sites, limit to 5-10 for focus
3. **subpageTarget** - Keywords that match the pages you want
4. **livecrawl: always** - For news/frequently updated content
5. **Highlights** - Extract key sentences without full text
6. **Summaries** - Get overview before deciding to get full text

## Output Templates

### Documentation Index

```markdown
# Documentation: [Product Name]

## Pages Crawled
1. [Page Title] - [URL]
   Summary: [Summary]

2. [Page Title] - [URL]
   Summary: [Summary]

## Key Concepts
- [Concept 1]: [Explanation from highlights]
- [Concept 2]: [Explanation from highlights]

## Code Examples Found
```[language]
[Code snippet from content]
```

## Links to Explore
- [Link 1]
- [Link 2]
```

### Content Digest

```markdown
# Content Digest: [Topic/Source]

## Sources
[List of URLs processed]

## Summary
[Overall synthesis]

## Key Points
1. [Point from highlights]
2. [Point from highlights]

## Notable Quotes
> "[Quote]" - [Source URL]

## Related Links
[Extracted links for further reading]
```
