# Exa MCP Server 🔍
[![npm version](https://badge.fury.io/js/exa-mcp-server.svg)](https://www.npmjs.com/package/exa-mcp-server)
[![smithery badge](https://smithery.ai/badge/exa)](https://smithery.ai/server/exa)

## 🆕 `exa-code`: fast, efficient web context for coding agents

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
      "headers": {
        "Remove-Me": "Disable web_search_exa tool if you're just coding. To 100% call exa-code, say 'use exa-code'."
      }
    }
  }
}
```

You may include your exa api key in the url like this:
```
https://mcp.exa.ai/mcp?exaApiKey=YOUREXAKEY
```

You may whitelist specific tools in the url with the `enabledTools` parameter which expects a url encoded array strings like this:
```
https://mcp.exa.ai/mcp?exaApiKey=YOUREXAKEY&enabledTools=%5B%22crawling_exa%ss%5D
```

You can also use `exa-code` through [Smithery](https://smithery.ai/server/exa) without an Exa API key.

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

#### 🔥 **Featured: Code Search Tool**
- **get_code_context_exa**: 🆕 **NEW!** Search and get relevant code snippets, examples, and documentation from open source libraries, GitHub repositories, and programming frameworks. Perfect for finding up-to-date code documentation, implementation examples, API usage patterns, and best practices from real codebases.

#### 🌐 **Other Available Tools**
- **web_search_exa**: Performs real-time web searches with optimized results and content extraction.
- **company_research**: Comprehensive company research tool that crawls company websites to gather detailed information about businesses.
- **crawling**: Extracts content from specific URLs, useful for reading articles, PDFs, or any web page when you have the exact URL.
- **linkedin_search**: Search LinkedIn for companies and people using Exa AI. Simply include company names, person names, or specific LinkedIn URLs in your query.
- **deep_researcher_start**: Start a smart AI researcher for complex questions. The AI will search the web, read many sources, and think deeply about your question to create a detailed research report.
- **deep_researcher_check**: Check if your research is ready and get the results. Use this after starting a research task to see if it's done and get your comprehensive report.

You can choose which tools to enable by adding the `--tools` parameter to your Claude Desktop configuration:

#### 💻 **Setup for Code Search Only** (Recommended for Developers)

```json
{
  "mcpServers": {
    "exa": {
      "command": "npx",
      "args": [
        "-y",
        "exa-mcp-server",
        "--tools=get_code_context_exa,web_search_exa"
      ],
      "env": {
        "EXA_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

#### Specify which tools to enable:

```json
{
  "mcpServers": {
    "exa": {
      "command": "npx",
      "args": [
        "-y",
        "exa-mcp-server",
        "--tools=get_code_context_exa,web_search_exa,company_research,crawling,linkedin_search,deep_researcher_start,deep_researcher_check"
      ],
      "env": {
        "EXA_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

For enabling multiple tools, use a comma-separated list:

```json
{
  "mcpServers": {
    "exa": {
      "command": "npx",
      "args": [
        "-y",
        "exa-mcp-server",
        "--tools=get_code_context_exa,web_search_exa,company_research,crawling,linkedin_search,deep_researcher_start,deep_researcher_check"
      ],
      "env": {
        "EXA_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

If you don't specify any tools, all tools enabled by default will be used.

### 4. Restart Claude Desktop

For the changes to take effect:

1. Completely quit Claude Desktop (not just close the window)
2. Start Claude Desktop again
3. Look for the icon to verify the Exa server is connected

## Using via NPX

If you prefer to run the server directly, you can use npx:

```bash
# Run with all tools enabled by default
npx exa-mcp-server

# Enable specific tools only
npx exa-mcp-server --tools=web_search_exa

# Enable multiple tools
npx exa-mcp-server --tools=web_search_exa,get_code_context_exa

# List all available tools
npx exa-mcp-server --list-tools
```

---

Built with ❤️ by team Exa
