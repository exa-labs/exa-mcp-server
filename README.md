# Exa MCP Server 🔍
[![Install in Cursor](https://img.shields.io/badge/Install_in-Cursor-000000?style=flat-square&logoColor=white)](https://cursor.com/en/install-mcp?name=exa&config=eyJuYW1lIjoiZXhhIiwidHlwZSI6Imh0dHAiLCJ1cmwiOiJodHRwczovL21jcC5leGEuYWkvbWNwIn0=)
[![Install in VS Code](https://img.shields.io/badge/Install_in-VS_Code-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://vscode.dev/redirect/mcp/install?name=exa&config=%7B%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Fmcp.exa.ai%2Fmcp%22%7D)
[![npm version](https://badge.fury.io/js/exa-mcp-server.svg)](https://www.npmjs.com/package/exa-mcp-server)
[![smithery badge](https://smithery.ai/badge/exa)](https://smithery.ai/server/exa)

## Exa Code: fast, efficient web context for coding agents

Vibe coding should never have a bad vibe. `exa-code` is a huge step towards coding agents that never hallucinate.

When your coding agent makes a search query, `exa-code` searches over billions
of Github repos, docs pages, Stackoverflow posts, and more, to find the perfect, token-efficient context that the agent needs to code correctly. It's powered by the Exa search engine.

Examples of queries you can make with `exa-code`:
* use Exa search in python and make sure content is always livecrawled
* use correct syntax for vercel ai sdk to call gpt-5 nano asking it how are you
* how to set up a reproducible Nix Rust development environment

**✨ Works with Cursor and Claude Code!** Use the HTTP-based configuration format:

```json
{
  "mcpServers": {
    "exa": {
      "type": "http",
      "url": "https://mcp.exa.ai/mcp",
      "headers": {}
    }
  }
}
```

You can enable specific tool(s) using the `tools` parameter (if multiple, then with a comma-separated list):
```
https://mcp.exa.ai/mcp?tools=web_search_exa,get_code_context_exa
```

Or enable all tools:
```
https://mcp.exa.ai/mcp?tools=web_search_exa,deep_search_exa,get_code_context_exa,crawling_exa,company_research_exa,linkedin_search_exa,deep_researcher_start,deep_researcher_check
```

You may include your exa api key in the url like this:
```
https://mcp.exa.ai/mcp?exaApiKey=YOUREXAKEY
```

**Note:** By default, only `web_search_exa` and `get_code_context_exa` are enabled. Add other tools as needed using the `tools` parameter.

---

A Model Context Protocol (MCP) server that connects AI assistants like Claude to Exa AI's search capabilities, including web search, research tools, and our new code search feature.

## Remote Exa MCP 🌐

Connect directly to Exa's hosted MCP server (instead of running it locally).

### Remote Exa MCP URL

```
https://mcp.exa.ai/mcp
```

### Claude Desktop Configuration for Remote MCP

Add this to your Claude Desktop configuration file:

```json
{
  "mcpServers": {
    "exa": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://mcp.exa.ai/mcp"
      ]
    }
  }
}
```

### Cursor and Claude Code Configuration for Remote MCP

For Cursor and Claude Code, use this HTTP-based configuration format:

```json
{
  "mcpServers": {
    "exa": {
      "type": "http",
      "url": "https://mcp.exa.ai/mcp",
      "headers": {}
    }
  }
}
```

### Codex Configuration for Remote MCP

Open your Codex configuration file:

```bash
code ~/.codex/config.toml
```

Add this configuration:

```toml
[mcp_servers.exa]
command = "npx"
args = ["-y", "mcp-remote", "https://mcp.exa.ai/mcp"]
env = { EXA_API_KEY = "your-api-key-here" }
```

Replace `your-api-key-here` with your actual Exa API key from [dashboard.exa.ai/api-keys](https://dashboard.exa.ai/api-keys).

### Claude Code Plugin

The easiest way to get started with Exa in Claude Code, using plugins:

```bash
# Add the Exa marketplace
/plugin marketplace add exa-labs/exa-mcp-server

# Install the plugin
/plugin install exa-mcp-server
```

Then set your API key:
```bash
export EXA_API_KEY="your-api-key-here"
```

Get your API key from [dashboard.exa.ai/api-keys](https://dashboard.exa.ai/api-keys).

### NPM Installation

```bash
npm install -g exa-mcp-server
```

### Using Claude Code

```bash
claude mcp add exa -e EXA_API_KEY=YOUR_API_KEY -- npx -y exa-mcp-server
```

### Using Exa MCP through Smithery

To install the Exa MCP server via [Smithery](https://smithery.ai/server/exa), head over to:

[smithery.ai/server/exa](https://smithery.ai/server/exa)


## Configuration ⚙️

### 1. Configure Claude Desktop to recognize the Exa MCP server

You can find claude_desktop_config.json inside the settings of Claude Desktop app:

Open the Claude Desktop app and enable Developer Mode from the top-left menu bar. 

Once enabled, open Settings (also from the top-left menu bar) and navigate to the Developer Option, where you'll find the Edit Config button. Clicking it will open the claude_desktop_config.json file, allowing you to make the necessary edits. 

OR (if you want to open claude_desktop_config.json from terminal)

#### For macOS:

1. Open your Claude Desktop configuration:

```bash
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

#### For Windows:

1. Open your Claude Desktop configuration:

```powershell
code %APPDATA%\Claude\claude_desktop_config.json
```

### 2. Add the Exa server configuration:

```json
{
  "mcpServers": {
    "exa": {
      "command": "npx",
      "args": ["-y", "exa-mcp-server"],
      "env": {
        "EXA_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

Replace `your-api-key-here` with your actual Exa API key from [dashboard.exa.ai/api-keys](https://dashboard.exa.ai/api-keys).

### 3. Available Tools & Tool Selection

The Exa MCP server includes powerful tools for developers and researchers:


#### 🌐 **Tools**
- **get_code_context_exa**: Search and get relevant code snippets, examples, and documentation from open source libraries, GitHub repositories, and programming frameworks. Perfect for finding up-to-date code documentation, implementation examples, API usage patterns, and best practices from real codebases.
- **web_search_exa**: Performs real-time web searches with optimized results and content extraction.
- **deep_search_exa**: Deep web search with smart query expansion and high-quality summaries for each result.
- **company_research_exa**: Comprehensive company research tool that crawls company websites to gather detailed information about businesses.
- **crawling_exa**: Extracts content from specific URLs, useful for reading articles, PDFs, or any web page when you have the exact URL.
- **linkedin_search_exa**: Search LinkedIn for companies and people using Exa AI. Simply include company names, person names, or specific LinkedIn URLs in your query.
- **deep_researcher_start**: Start a smart AI researcher for complex questions. The AI will search the web, read many sources, and think deeply about your question to create a detailed research report.
- **deep_researcher_check**: Check if your research is ready and get the results. Use this after starting a research task to see if it's done and get your comprehensive report.

**Note:** By default, only `web_search_exa` and `get_code_context_exa` are enabled. You can enable additional tools using the `tools=` parameter (see examples below).

#### 💻 **Setup for Code Search Only** (Recommended for Developers)

```json
{
  "mcpServers": {
    "exa": {
      "command": "npx",
      "args": [
        "-y",
        "exa-mcp-server",
        "tools=get_code_context_exa"
      ],
      "env": {
        "EXA_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

#### Enable All Tools:

You can either enable all tools or any specfic tools. Use a comma-separated list to enable the tools you need:

```json
{
  "mcpServers": {
    "exa": {
      "command": "npx",
      "args": [
        "-y",
        "exa-mcp-server",
        "tools=get_code_context_exa,web_search_exa,deep_search_exa,company_research_exa,crawling_exa,linkedin_search_exa,deep_researcher_start,deep_researcher_check"
      ],
      "env": {
        "EXA_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## Using via NPX

If you prefer to run the server directly, you can use npx:

```bash
# Run with default tools only (web_search_exa and get_code_context_exa)
npx exa-mcp-server

# Enable specific tools only
npx exa-mcp-server tools=web_search_exa

# All tools
npx exa-mcp-server tools=web_search_exa,deep_search_exa,get_code_context_exa,crawling_exa,company_research_exa,linkedin_search_exa,deep_researcher_start,deep_researcher_check
```

---

Built with ❤️ by team Exa
