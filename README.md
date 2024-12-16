# Enhanced Exa MCP Server

This is an enhanced fork of the [original Exa MCP server](https://github.com/exa-labs/exa-mcp-server) that provides neural search capabilities using the Exa API. The server enables Large Language Models (LLMs) to search and analyze both academic research papers and news articles with improved semantic understanding.

## What's New in This Fork

- **Always Comprehensive**: Returns both research papers and news articles for every query
- **Enhanced Result Format**: Includes source domains, relevance scores, and content highlights
- **Improved Error Handling**: Better error messages and type safety
- **Rich Console Output**: Colorized logging for better debugging
- **Type Safety**: Fully typed TypeScript implementation

## Prerequisites

- Node.js (v16 or higher)
- NPM
- An Exa API key (get one from [Exa's website](https://exa.ai))

## Quick Start

1. Fork and clone the repository:
```bash
# Fork using GitHub's interface, then:
git clone https://github.com/YOUR_USERNAME/exa-mcp-server.git
cd exa-mcp-server

# Add original repo as upstream
git remote add upstream https://github.com/exa-labs/exa-mcp-server.git
```

2. Install dependencies:
```bash
npm install
```

3. Set up your API key:
```bash
echo "EXA_API_KEY=your-api-key-here" > .env
```

4. Build the server:
```bash
npm run build
```

## Connecting to Claude Desktop

1. Create or edit your Claude Desktop config:

```bash
# On macOS:
mkdir -p ~/Library/Application\ Support/Claude/
code ~/Library/Application\ Support/Claude/claude_desktop_config.json

# On Windows:
code %APPDATA%\Claude\claude_desktop_config.json
```

2. Add the server configuration:
```json
{
  "mcpServers": {
    "exa": {
      "command": "node",
      "args": ["/absolute/path/to/exa-mcp-server/build/index.js"]
    }
  }
}
```

3. Restart Claude Desktop

## Features

### Search Capabilities
- Neural search with semantic understanding
- Dual category search (research papers + news)
- Content highlights and summaries
- Source attribution and relevance scoring
- Query caching and history

### Response Format

Every search returns results in this format:
```json
{
  "research_papers": {
    "results": [
      {
        "title": "Example Research Paper",
        "url": "https://example.edu/paper",
        "source": "example.edu",
        "relevance_score": 0.95,
        "highlights": ["relevant excerpt 1", "relevant excerpt 2"],
        "summary": "Brief summary of the paper..."
      }
    ],
    "total_found": 100
  },
  "news_articles": {
    "results": [...],
    "total_found": 50
  },
  "query_info": {
    "query": "original search query",
    "timestamp": "2024-12-16T00:00:00.000Z",
    "results_per_category": 10
  }
}
```

## Development

### Project Structure
```
exa-mcp-server/
├── src/
│   └── index.ts      # Main server implementation
├── build/            # Compiled JavaScript
├── package.json
├── tsconfig.json
└── .env
```

### Staying Updated with Upstream

To get updates from the original repo:
```bash
git fetch upstream
git checkout main
git merge upstream/main
```

### Making Changes

1. Create a new branch:
```bash
git checkout -b feature/your-feature-name
```

2. Make your changes and commit:
```bash
git add .
git commit -m "Description of your changes"
```

3. Push to your fork:
```bash
git push origin feature/your-feature-name
```

## Contributing Back

1. Update your fork with the latest upstream changes
2. Make your improvements in a new branch
3. Push to your fork
4. Create a Pull Request to the original repository
5. Describe your changes and why they're valuable

## Troubleshooting

### Common Issues

1. **Build Errors**
   - Make sure TypeScript is installed: `npm install -D typescript`
   - Check your Node.js version: `node --version`

2. **Connection Issues**
   - Verify your API key in .env
   - Check Claude Desktop config path
   - Ensure absolute paths are used

3. **Type Errors**
   - Run `npm install` to get latest types
   - Check TypeScript version matches requirements

## Credit

This project is a fork of the [Exa MCP Server](https://github.com/exa-labs/exa-mcp-server) created by Exa Labs. The original work laid the foundation for this enhanced version.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Original Exa MCP Server](https://github.com/exa-labs/exa-mcp-server)
- [Model Context Protocol](https://github.com/modelcontextprotocol)
- [Exa API](https://exa.ai)
- [Claude by Anthropic](https://anthropic.com)