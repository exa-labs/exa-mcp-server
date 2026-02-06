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

<details>
<summary><b>Cursor</b></summary>

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "exa": {
      "url": "https://mcp.exa.ai/mcp"
    }
  }
}
```
</details>

<details>
<summary><b>VS Code</b></summary>

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "exa": {
      "type": "http",
      "url": "https://mcp.exa.ai/mcp"
    }
  }
}
```
</details>

<details>
<summary><b>Claude Code</b></summary>

```bash
claude mcp add --transport http exa https://mcp.exa.ai/mcp
```
</details>

<details>
<summary><b>Claude Desktop</b></summary>

Add to your config file:
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "exa": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.exa.ai/mcp"]
    }
  }
}
```
</details>

<details>
<summary><b>Codex</b></summary>

```bash
codex mcp add exa --url https://mcp.exa.ai/mcp
```
</details>

<details>
<summary><b>OpenCode</b></summary>

Add to your `opencode.json`:

```json
{
  "mcp": {
    "exa": {
      "type": "remote",
      "url": "https://mcp.exa.ai/mcp",
      "enabled": true
    }
  }
}
```
</details>

<details>
<summary><b>Antigravity</b></summary>

Open the MCP Store panel (from the "..." dropdown in the side panel), then add a custom server with:

```
https://mcp.exa.ai/mcp
```
</details>

<details>
<summary><b>Windsurf</b></summary>

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "exa": {
      "serverUrl": "https://mcp.exa.ai/mcp"
    }
  }
}
```
</details>

<details>
<summary><b>Zed</b></summary>

Add to your Zed settings:

```json
{
  "context_servers": {
    "exa": {
      "url": "https://mcp.exa.ai/mcp"
    }
  }
}
```
</details>

<details>
<summary><b>Gemini CLI</b></summary>

Add to `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "exa": {
      "httpUrl": "https://mcp.exa.ai/mcp"
    }
  }
}
```
</details>

<details>
<summary><b>v0 by Vercel</b></summary>

In v0, select **Prompt Tools** > **Add MCP** and enter:

```
https://mcp.exa.ai/mcp
```
</details>

<details>
<summary><b>Warp</b></summary>

Go to **Settings** > **MCP Servers** > **Add MCP Server** and add:

```json
{
  "exa": {
    "url": "https://mcp.exa.ai/mcp"
  }
}
```
</details>

<details>
<summary><b>Kiro</b></summary>

Add to `~/.kiro/settings/mcp.json`:

```json
{
  "mcpServers": {
    "exa": {
      "url": "https://mcp.exa.ai/mcp"
    }
  }
}
```
</details>

<details>
<summary><b>Roo Code</b></summary>

Add to your Roo Code MCP config:

```json
{
  "mcpServers": {
    "exa": {
      "type": "streamable-http",
      "url": "https://mcp.exa.ai/mcp"
    }
  }
}
```
</details>

<details>
<summary><b>Other Clients</b></summary>

For clients that support remote MCP:

```json
{
  "mcpServers": {
    "exa": {
      "url": "https://mcp.exa.ai/mcp"
    }
  }
}
```

For clients that need mcp-remote:

```json
{
  "mcpServers": {
    "exa": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.exa.ai/mcp"]
    }
  }
}
```
</details>

<details>
<summary><b>Via npm Package</b></summary>

Use the npm package with your API key. [Get your API key](https://dashboard.exa.ai/api-keys).

```json
{
  "mcpServers": {
    "exa": {
      "command": "npx",
      "args": ["-y", "exa-mcp-server"],
      "env": {
        "EXA_API_KEY": "your_api_key"
      }
    }
  }
}
```
</details>

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
