# Exa MCP Server

[![Install in Cursor](https://img.shields.io/badge/Install_in-Cursor-000000?style=flat-square&logoColor=white)](https://cursor.com/en/install-mcp?name=exa&config=eyJuYW1lIjoiZXhhIiwidHlwZSI6Imh0dHAiLCJ1cmwiOiJodHRwczovL21jcC5leGEuYWkvbWNwIn0=)
[![Install in VS Code](https://img.shields.io/badge/Install_in-VS_Code-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://vscode.dev/redirect/mcp/install?name=exa&config=%7B%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Fmcp.exa.ai%2Fmcp%22%7D)
[![npm version](https://badge.fury.io/js/exa-mcp-server.svg)](https://www.npmjs.com/package/exa-mcp-server)
[![smithery badge](https://smithery.ai/badge/exa)](https://smithery.ai/server/exa)

Connect AI assistants to Exa's search capabilities: web search, code search, and company research.

**[Full Documentation](https://docs.exa.ai/reference/exa-mcp)** | **[npm Package](https://www.npmjs.com/package/exa-mcp-server)** | **[Get Your Exa API Key](https://dashboard.exa.ai/api-keys)**

## Installation

Connect to Exa's hosted MCP server:

```
https://mcp.exa.ai/mcp
```

[Get your API key](https://dashboard.exa.ai/api-keys)

[![Cursor](https://img.shields.io/badge/Cursor-333?style=flat-square)](#cursor) [![VS Code](https://img.shields.io/badge/VS_Code-007ACC?style=flat-square&logo=visualstudiocode&logoColor=white)](#vs-code) [![Claude Code](https://img.shields.io/badge/Claude_Code-D4A574?style=flat-square)](#claude-code) [![Claude Desktop](https://img.shields.io/badge/Claude_Desktop-D4A574?style=flat-square)](#claude-desktop) [![Codex](https://img.shields.io/badge/Codex-10A37F?style=flat-square)](#codex) [![OpenCode](https://img.shields.io/badge/OpenCode-555?style=flat-square)](#opencode) [![Antigravity](https://img.shields.io/badge/Antigravity-555?style=flat-square)](#antigravity) [![Windsurf](https://img.shields.io/badge/Windsurf-0FC?style=flat-square)](#windsurf) [![Zed](https://img.shields.io/badge/Zed-555?style=flat-square)](#zed) [![Gemini CLI](https://img.shields.io/badge/Gemini_CLI-4285F4?style=flat-square)](#gemini-cli) [![v0](https://img.shields.io/badge/v0_by_Vercel-000?style=flat-square)](#v0-by-vercel) [![Warp](https://img.shields.io/badge/Warp-01A4FF?style=flat-square)](#warp) [![Kiro](https://img.shields.io/badge/Kiro-FF9900?style=flat-square)](#kiro) [![Roo Code](https://img.shields.io/badge/Roo_Code-555?style=flat-square)](#roo-code) [![Other](https://img.shields.io/badge/Other_Clients-888?style=flat-square)](#other-clients) [![npm](https://img.shields.io/badge/npm_Package-CB3837?style=flat-square&logo=npm&logoColor=white)](#via-npm-package)

<h4 id="cursor">Cursor</h4>

Add to `~/.cursor/mcp.json`:
```json
{ "mcpServers": { "exa": { "url": "https://mcp.exa.ai/mcp" } } }
```

<h4 id="vs-code">VS Code</h4>

Add to `.vscode/mcp.json`:
```json
{ "servers": { "exa": { "type": "http", "url": "https://mcp.exa.ai/mcp" } } }
```

<h4 id="claude-code">Claude Code</h4>

```bash
claude mcp add --transport http exa https://mcp.exa.ai/mcp
```

<h4 id="claude-desktop">Claude Desktop</h4>

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json` · **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
```json
{ "mcpServers": { "exa": { "command": "npx", "args": ["-y", "mcp-remote", "https://mcp.exa.ai/mcp"] } } }
```

<h4 id="codex">Codex</h4>

```bash
codex mcp add exa --url https://mcp.exa.ai/mcp
```

<h4 id="opencode">OpenCode</h4>

Add to `opencode.json`:
```json
{ "mcp": { "exa": { "type": "remote", "url": "https://mcp.exa.ai/mcp", "enabled": true } } }
```

<h4 id="antigravity">Antigravity</h4>

Open the MCP Store panel (from the "..." dropdown) → add custom server → `https://mcp.exa.ai/mcp`

<h4 id="windsurf">Windsurf</h4>

Add to `~/.codeium/windsurf/mcp_config.json`:
```json
{ "mcpServers": { "exa": { "serverUrl": "https://mcp.exa.ai/mcp" } } }
```

<h4 id="zed">Zed</h4>

Add to your Zed settings:
```json
{ "context_servers": { "exa": { "url": "https://mcp.exa.ai/mcp" } } }
```

<h4 id="gemini-cli">Gemini CLI</h4>

Add to `~/.gemini/settings.json`:
```json
{ "mcpServers": { "exa": { "httpUrl": "https://mcp.exa.ai/mcp" } } }
```

<h4 id="v0-by-vercel">v0 by Vercel</h4>

Select **Prompt Tools** → **Add MCP** → `https://mcp.exa.ai/mcp`

<h4 id="warp">Warp</h4>

**Settings** → **MCP Servers** → **Add MCP Server**:
```json
{ "exa": { "url": "https://mcp.exa.ai/mcp" } }
```

<h4 id="kiro">Kiro</h4>

Add to `~/.kiro/settings/mcp.json`:
```json
{ "mcpServers": { "exa": { "url": "https://mcp.exa.ai/mcp" } } }
```

<h4 id="roo-code">Roo Code</h4>

Add to your Roo Code MCP config:
```json
{ "mcpServers": { "exa": { "type": "streamable-http", "url": "https://mcp.exa.ai/mcp" } } }
```

<h4 id="other-clients">Other Clients</h4>

For clients that support remote MCP:
```json
{ "mcpServers": { "exa": { "url": "https://mcp.exa.ai/mcp" } } }
```
For clients that need mcp-remote:
```json
{ "mcpServers": { "exa": { "command": "npx", "args": ["-y", "mcp-remote", "https://mcp.exa.ai/mcp"] } } }
```

<h4 id="via-npm-package">Via npm Package</h4>

Use the npm package with your API key. [Get your API key](https://dashboard.exa.ai/api-keys).
```json
{
  "mcpServers": {
    "exa": {
      "command": "npx",
      "args": ["-y", "exa-mcp-server"],
      "env": { "EXA_API_KEY": "your_api_key" }
    }
  }
}
```

## Available Tools

**Enabled by Default:**
| Tool | Description |
| ---- | ----------- |
| `web_search_exa` | Search the web for any topic and get clean, ready-to-use content |
| `get_code_context_exa` | Find code examples, documentation, and programming solutions from GitHub, Stack Overflow, and docs |
| `company_research_exa` | Research any company to get business information, news, and insights |

**Off by Default:**
| Tool | Description |
| ---- | ----------- |
| `web_search_advanced_exa` | Advanced web search with full control over filters, domains, dates, and content options |
| `crawling_exa` | Get the full content of a specific webpage from a known URL |
| `people_search_exa` | Find people and their professional profiles |
| `deep_researcher_start` | Start an AI research agent that searches, reads, and writes a detailed report |
| `deep_researcher_check` | Check status and get results from a deep research task |

Enable all tools with the `tools` parameter:

```
https://mcp.exa.ai/mcp?tools=web_search_exa,web_search_advanced_exa,get_code_context_exa,crawling_exa,company_research_exa,people_search_exa,deep_researcher_start,deep_researcher_check
```

## Links

- [Documentation](https://docs.exa.ai/reference/exa-mcp)
- [npm Package](https://www.npmjs.com/package/exa-mcp-server)
- [Get Your Exa API Key](https://dashboard.exa.ai/api-keys)


<br>

Built with ❤️ by Exa
