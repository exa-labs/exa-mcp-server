# Exa MCP Server - Installation & Configuration

> AI-powered web search for Claude Desktop, Cursor, and Claude Code

## Quick Start

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "exa": {
      "command": "npx",
      "args": ["-y", "exa-mcp-server"],
      "env": {
        "EXA_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Cursor / Claude Code (HTTP)

```json
{
  "mcpServers": {
    "exa": {
      "type": "http",
      "url": "https://mcp.exa.ai/mcp",
      "headers": {
        "x-api-key": "your-api-key"
      }
    }
  }
}
```

---

## Configuration Presets

Choose a preset based on your use case. All presets use the self-documenting `enabled`/`disabled` pattern.

### Basic Search (Default)

Web search + code context. Good for general use.

**CLI:**
```bash
npx exa-mcp-server --enabled=web_search_exa,get_code_context_exa
```

**HTTP:**
```
https://mcp.exa.ai/mcp?enabled=web_search_exa,get_code_context_exa
```

**Enabled:** `web_search_exa`, `get_code_context_exa`
**Disabled:** `web_search_advanced`, `find_similar_exa`, `answer_exa`, `crawl_urls_exa`, `deep_search_exa`, `crawling_exa`, `deep_researcher_start`, `deep_researcher_check`, `linkedin_search_exa`, `company_research_exa`

---

### Power User

All search tools with full API control.

**CLI:**
```bash
npx exa-mcp-server --enabled=web_search_exa,web_search_advanced,get_code_context_exa,find_similar_exa,answer_exa,crawl_urls_exa
```

**HTTP:**
```
https://mcp.exa.ai/mcp?enabled=web_search_exa,web_search_advanced,get_code_context_exa,find_similar_exa,answer_exa,crawl_urls_exa
```

**Enabled:** `web_search_exa`, `web_search_advanced`, `get_code_context_exa`, `find_similar_exa`, `answer_exa`, `crawl_urls_exa`
**Disabled:** `deep_search_exa`, `crawling_exa`, `deep_researcher_start`, `deep_researcher_check`, `linkedin_search_exa`, `company_research_exa`

---

### Company Research

Research companies from Bloomberg, SEC, news sources.

**CLI:**
```bash
npx exa-mcp-server --enabled=web_search_exa,web_search_advanced,company_research_exa,deep_search_exa,crawling_exa
```

**HTTP:**
```
https://mcp.exa.ai/mcp?enabled=web_search_exa,web_search_advanced,company_research_exa,deep_search_exa,crawling_exa
```

**Enabled:** `web_search_exa`, `web_search_advanced`, `company_research_exa`, `deep_search_exa`, `crawling_exa`
**Disabled:** `get_code_context_exa`, `find_similar_exa`, `answer_exa`, `crawl_urls_exa`, `deep_researcher_start`, `deep_researcher_check`, `linkedin_search_exa`

---

### GTM / Sales

Prospect research with company + people data.

**CLI:**
```bash
npx exa-mcp-server --enabled=web_search_exa,web_search_advanced,company_research_exa,linkedin_search_exa,crawling_exa
```

**HTTP:**
```
https://mcp.exa.ai/mcp?enabled=web_search_exa,web_search_advanced,company_research_exa,linkedin_search_exa,crawling_exa
```

**Enabled:** `web_search_exa`, `web_search_advanced`, `company_research_exa`, `linkedin_search_exa`, `crawling_exa`
**Disabled:** `get_code_context_exa`, `find_similar_exa`, `answer_exa`, `crawl_urls_exa`, `deep_search_exa`, `deep_researcher_start`, `deep_researcher_check`

---

### Full Power

Everything enabled. For power users and custom skills.

**CLI:**
```bash
npx exa-mcp-server --enabled=web_search_exa,web_search_advanced,get_code_context_exa,find_similar_exa,answer_exa,crawl_urls_exa,deep_search_exa,crawling_exa,deep_researcher_start,deep_researcher_check,linkedin_search_exa,company_research_exa
```

**HTTP:**
```
https://mcp.exa.ai/mcp?enabled=web_search_exa,web_search_advanced,get_code_context_exa,find_similar_exa,answer_exa,crawl_urls_exa,deep_search_exa,crawling_exa,deep_researcher_start,deep_researcher_check,linkedin_search_exa,company_research_exa
```

**Enabled:** All 12 tools
**Disabled:** None

---

## Available Tools (12 Total)

| Tool ID | Name | Description | Default |
|---------|------|-------------|---------|
| `web_search_exa` | Web Search | Real-time web search with basic params | Enabled |
| `web_search_advanced` | Advanced Web Search | Full API control: categories, domains, dates, highlights, summaries, subpages | Disabled |
| `get_code_context_exa` | Code Context | Search code, docs, and examples from open source repos | Enabled |
| `find_similar_exa` | Find Similar | Find web pages similar to a given URL | Disabled |
| `answer_exa` | Answer | Get direct answers with citations | Disabled |
| `crawl_urls_exa` | Crawl URLs | Batch crawl URLs with advanced extraction | Disabled |
| `deep_search_exa` | Deep Search | Query expansion + high-quality summaries | Disabled |
| `crawling_exa` | Web Crawling | Extract content from specific URLs | Disabled |
| `deep_researcher_start` | Deep Researcher Start | Start comprehensive AI research task | Disabled |
| `deep_researcher_check` | Deep Researcher Check | Check research task status/results | Disabled |
| `linkedin_search_exa` | LinkedIn Search | Search LinkedIn profiles and companies | Disabled |
| `company_research_exa` | Company Research | Research companies and organizations | Disabled |

---

## Tool Parameters Reference

### web_search_exa (Simple)

Basic web search for everyday use.

```typescript
query: string           // Search query
numResults?: number     // 1-100 (default: 8)
type?: 'auto' | 'fast' | 'deep'  // Search type (default: 'auto')
```

---

### web_search_advanced (Full API)

Full Exa API surface for building skills and advanced workflows.

```typescript
// Core
query: string
numResults?: number     // 1-100 (default: 8)
type?: 'auto' | 'fast' | 'deep' | 'neural'

// Category filtering
category?: 'company' | 'research paper' | 'news' | 'pdf' | 'github' |
           'tweet' | 'personal site' | 'people' | 'financial report'

// Domain filtering (up to 1200 domains each)
includeDomains?: string[]
excludeDomains?: string[]

// Date filtering (ISO 8601: YYYY-MM-DD)
startPublishedDate?: string
endPublishedDate?: string
startCrawlDate?: string
endCrawlDate?: string

// Content filtering
includeText?: string[]  // Required text in results
excludeText?: string[]  // Excluded text

// Geo-targeting
userLocation?: string   // ISO country code (e.g., "US")

// Content moderation
moderation?: boolean    // Filter unsafe content

// Livecrawl options
livecrawl?: 'never' | 'fallback' | 'always' | 'preferred'
livecrawlTimeout?: number  // Timeout in ms

// Text extraction
textMaxCharacters?: number

// Highlights extraction
enableHighlights?: boolean
highlightsNumSentences?: number
highlightsPerUrl?: number
highlightsQuery?: string

// Summary generation
enableSummary?: boolean
summaryQuery?: string

// Subpage crawling
subpages?: number       // 1-10
subpageTarget?: string[]

// Extras
extractLinks?: number   // URLs per page
extractImages?: number  // Images per result

// Query expansion
additionalQueries?: string[]
```

---

### find_similar_exa

Find web pages similar to a given URL.

```typescript
url: string             // URL to find similar content for
numResults?: number     // 1-100 (default: 10)
includeDomains?: string[]
excludeDomains?: string[]
startPublishedDate?: string
endPublishedDate?: string
category?: 'company' | 'research paper' | 'news' | 'pdf' | 'github' |
           'tweet' | 'personal site' | 'people' | 'financial report'
excludeSourceDomain?: boolean  // Exclude source URL's domain (default: true)
textMaxCharacters?: number
contextMaxCharacters?: number  // (default: 10000)
```

---

### answer_exa

Get a direct answer with citations from the web.

```typescript
query: string           // Question to answer
numResults?: number     // Number of sources (1-20, default: 5)
includeDomains?: string[]
excludeDomains?: string[]
startPublishedDate?: string
endPublishedDate?: string
category?: 'company' | 'research paper' | 'news' | 'pdf' | 'github' |
           'tweet' | 'personal site' | 'people' | 'financial report'
```

---

### crawl_urls_exa

Crawl and extract content from multiple URLs.

```typescript
urls: string[]          // URLs to crawl
textMaxCharacters?: number
enableSummary?: boolean
summaryQuery?: string   // Focus query for summary
enableHighlights?: boolean
highlightsNumSentences?: number
highlightsPerUrl?: number
highlightsQuery?: string
livecrawl?: 'never' | 'fallback' | 'always' | 'preferred'
livecrawlTimeout?: number
subpages?: number       // 1-10
subpageTarget?: string[]
```

---

## Configuration Options

### URL/CLI Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `enabled` | string | Comma-separated list of tools to enable |
| `disabled` | string | Comma-separated list of tools to disable (optional, for display) |
| `tools` | string | [LEGACY] Alias for enabled, backwards compatible |
| `enabledTools` | string | [LEGACY] Alias for enabled, backwards compatible |
| `debug` | boolean | Enable debug logging |

### Environment Variables

| Variable | Description |
|----------|-------------|
| `EXA_API_KEY` | Exa AI API key |

### API Key Methods

```bash
# Environment variable (recommended)
export EXA_API_KEY="your-api-key"

# HTTP header
headers: { "x-api-key": "your-api-key" }

# Query parameter (easy sharing)
?exaApiKey=your-api-key
```

---

## Examples

### Category-Filtered Search

Search only news articles from the last week:

```typescript
// Using web_search_advanced
{
  query: "AI regulations",
  category: "news",
  startPublishedDate: "2024-01-01",
  numResults: 10
}
```

### Domain-Restricted Research

Search only from trusted sources:

```typescript
{
  query: "climate change research",
  includeDomains: ["nature.com", "science.org", "arxiv.org"],
  category: "research paper"
}
```

### Find Competitors

Find similar companies to a given website:

```typescript
// Using find_similar_exa
{
  url: "https://example-startup.com",
  category: "company",
  numResults: 20
}
```

### Q&A with Citations

Get a factual answer with sources:

```typescript
// Using answer_exa
{
  query: "What is the current market cap of Apple?",
  category: "financial report",
  numResults: 5
}
```

### Batch Content Extraction

Crawl multiple URLs with summaries:

```typescript
// Using crawl_urls_exa
{
  urls: [
    "https://example.com/article1",
    "https://example.com/article2"
  ],
  enableSummary: true,
  enableHighlights: true,
  highlightsPerUrl: 3
}
```

---

## Version History

- **3.2.0** - Added `web_search_advanced`, `find_similar_exa`, `answer_exa`, `crawl_urls_exa`. New `enabled`/`disabled` URL pattern.
- **3.1.x** - Core tools: web_search, code_context, deep_search, company_research, linkedin, crawling, deep_researcher
