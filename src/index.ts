#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  Tool,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from "@modelcontextprotocol/sdk/types.js";
import * as ExaModule from "exa-js";
import dotenv from "dotenv";
import chalk from 'chalk';

const Exa = ExaModule.default || ExaModule;
dotenv.config();

const API_KEY = process.env.EXA_API_KEY;
if (!API_KEY) {
  throw new Error("EXA_API_KEY environment variable is required");
}

interface CachedSearch {
  query: string;
  response: any;
  timestamp: string;
  category: string;
}

interface SearchArguments {
  query: string;
  category?: 'research' | 'news' | 'both';
  numResults?: number;
  includeContent?: boolean;
  highlightResults?: boolean;
}

interface ExaResult {
  title: string;
  url: string;
  score: number;
  content?: {
    text?: string;
    highlights?: string[];
  };
}

interface ExaResponse {
  results?: ExaResult[];
  totalResults?: number;
}

interface FormattedResult {
  title: string;
  url: string;
  source: string;
  relevance_score: number;
  highlights: string[];
  summary: string;
}

interface FormattedResults {
  research_papers: {
    results: FormattedResult[];
    total_found: number;
  };
  news_articles: {
    results: FormattedResult[];
    total_found: number;
  };
  query_info: {
    query: string;
    timestamp: string;
    results_per_category: number;
  };
}

interface SearchResult {
  title: string;
  url: string;
  score: number;
  content?: {
    text?: string;
    highlights?: string[];
  };
}

const EXA_SEARCH_TOOL: Tool = {
  name: "search",
  description: `A powerful search tool using Exa's neural search API for comprehensive research and news discovery.

When to use this tool:
- Researching academic topics with scholarly papers
- Finding recent news on specific topics
- Gathering information from multiple reliable sources
- Cross-referencing information across different types of content
- Deep diving into specific research areas
- Fact-checking against reliable sources
- Exploring recent developments in any field

Key features:
- Neural search for better semantic understanding
- Separate research paper and news categories
- Automatic content highlighting
- Source credibility ranking
- Relevance scoring
- Support for various content types

Search categories:
1. Research Papers:
   - Academic publications
   - Scientific journals
   - Technical documents
   - Conference proceedings
   - Preprints and archives

2. News:
   - Current events
   - Industry news
   - Technology updates
   - Company announcements
   - Expert analysis

Best practices:
1. Use specific, focused queries
2. Include relevant technical terms
3. Consider time relevance
4. Use boolean operators when needed
5. Start broad, then refine
6. Cross-reference multiple sources
7. Verify information accuracy

Parameters explained:
- query: Your search query string
- category: Type of content to search ("research" or "news")
- numResults: Number of results to return (1-50)
- includeContent: Whether to include full text content
- highlightResults: Whether to include relevant text highlights`,
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query"
      },
      category: {
        type: "string",
        enum: ["research", "news", "both"],
        description: "Type of content to search",
        default: "both"
      },
      numResults: {
        type: "number",
        description: "Number of results (1-50)",
        minimum: 1,
        maximum: 50,
        default: 10
      },
      includeContent: {
        type: "boolean",
        description: "Include full text content",
        default: false
      },
      highlightResults: {
        type: "boolean",
        description: "Include relevant text highlights",
        default: true
      }
    },
    required: ["query"]
  }
};

class ExaServer {
  private server: Server;
  private exa: any;
  private recentSearches: CachedSearch[] = [];
  private readonly MAX_CACHED_SEARCHES = 10;

  constructor() {
    const ExaDefault = Exa.default || Exa;
    this.exa = new ExaDefault(API_KEY);

    this.server = new Server({
      name: "exa-search-server",
      version: "0.2.0"
    }, {
      capabilities: {
        tools: {}
      }
    });

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private extractDomain(url: string): string {
    try {
      const domain = new URL(url).hostname;
      return domain.replace(/^www\./, '');
    } catch {
      return 'unknown-source';
    }
  }

  private formatSearchResults(results: SearchResult[], category: string): string {
    const formattedResults = results.map((result, index) => {
      const header = chalk.blue(`[${category.toUpperCase()}] Result ${index + 1}`);
      const title = chalk.green(`Title: ${result.title}`);
      const url = chalk.yellow(`URL: ${result.url}`);
      const score = chalk.cyan(`Relevance Score: ${result.score}`);
      
      let content = '';
      if (result.content) {
        if (result.content.text) {
          content += `\nContent: ${result.content.text}`;
        }
        if (result.content.highlights && result.content.highlights.length > 0) {
          content += '\nHighlights:\n' + result.content.highlights.map(h => `- ${h}`).join('\n');
        }
      }

      return `${header}\n${title}\n${url}\n${score}${content}\n${'-'.repeat(50)}`;
    }).join('\n');

    return formattedResults;
  }

  private async performSearch(query: unknown, category: string, options: any) {
    if (typeof query !== 'string') {
      throw new Error('Query must be a string');
    }
    
    try {
      const searchOptions = {
        type: "neural",
        category: category === "research" ? "research paper" : "news",
        useAutoprompt: true,
        ...options
      };

      const results = await this.exa.search(query, searchOptions);

      // Cache results
      this.recentSearches.unshift({
        query,
        response: results,
        timestamp: new Date().toISOString(),
        category
      });

      if (this.recentSearches.length > this.MAX_CACHED_SEARCHES) {
        this.recentSearches.pop();
      }

      console.error(this.formatSearchResults(results.results || [], category));

      return results;
    } catch (error) {
      console.error(`Search error (${category}):`, error);
      throw error;
    }
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error(chalk.red("[MCP Error]"), error);
    };

    process.on('SIGINT', async () => {
      console.error(chalk.yellow("\nShutting down Exa Search server..."));
      await this.server.close();
      process.exit(0);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
    });
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [EXA_SEARCH_TOOL]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name !== "search") {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
      }

      const args = request.params.arguments as SearchArguments | undefined;
      if (!args?.query || typeof args.query !== 'string') {
        throw new McpError(
          ErrorCode.InvalidParams,
          "Query is required and must be a string"
        );
      }

      try {
        const category = args.category || "both";
        const options = {
          limit: args.numResults || 10,
          contents: args.includeContent ? { text: true } : undefined,
          highlights: args.highlightResults
        };

        const [researchResults, newsResults] = await Promise.all([
          this.performSearch(args.query, "research", options),
          this.performSearch(args.query, "news", options)
        ]) as [ExaResponse, ExaResponse];

        // Format results to emphasize relevant links and sources
        const formattedResults: FormattedResults = {
          research_papers: {
            results: researchResults.results?.map((result: ExaResult) => ({
              title: result.title,
              url: result.url,
              source: this.extractDomain(result.url),
              relevance_score: result.score,
              highlights: result.content?.highlights || [],
              summary: result.content?.text || ''
            })) || [],
            total_found: researchResults.totalResults || 0
          },
          news_articles: {
            results: newsResults.results?.map((result: ExaResult) => ({
              title: result.title,
              url: result.url,
              source: this.extractDomain(result.url),
              relevance_score: result.score,
              highlights: result.content?.highlights || [],
              summary: result.content?.text || ''
            })) || [],
            total_found: newsResults.totalResults || 0
          },
          query_info: {
            query: args.query,
            timestamp: new Date().toISOString(),
            results_per_category: options.limit || 10
          }
        };

        return {
          content: [{
            type: "text",
            text: JSON.stringify(formattedResults, null, 2)
          }]
        };
      } catch (error: unknown) {
        console.error(chalk.red("Search error:"), error);
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to perform search: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error(chalk.green("Exa Search MCP server running on stdio"));
  }
}

const server = new ExaServer();
server.run().catch((error) => {
  console.error(chalk.red("Fatal error running server:"), error);
  process.exit(1);
});