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

<table>
<tr>
<td><details><summary><b>Cursor</b></summary><br>
Add to <code>~/.cursor/mcp.json</code>:
<pre lang="json">{
  "mcpServers": {
    "exa": {
      "url": "https://mcp.exa.ai/mcp"
    }
  }
}</pre>
</details></td>
<td><details><summary><b>VS Code</b></summary><br>
Add to <code>.vscode/mcp.json</code>:
<pre lang="json">{
  "servers": {
    "exa": {
      "type": "http",
      "url": "https://mcp.exa.ai/mcp"
    }
  }
}</pre>
</details></td>
<td><details><summary><b>Claude Code</b></summary><br>
<pre>claude mcp add --transport http exa https://mcp.exa.ai/mcp</pre>
</details></td>
<td><details><summary><b>Claude Desktop</b></summary><br>
Config file:<br>
<b>macOS:</b> <code>~/Library/Application Support/Claude/claude_desktop_config.json</code><br>
<b>Windows:</b> <code>%APPDATA%\Claude\claude_desktop_config.json</code>
<pre lang="json">{
  "mcpServers": {
    "exa": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.exa.ai/mcp"]
    }
  }
}</pre>
</details></td>
</tr>
<tr>
<td><details><summary><b>Codex</b></summary><br>
<pre>codex mcp add exa --url https://mcp.exa.ai/mcp</pre>
</details></td>
<td><details><summary><b>OpenCode</b></summary><br>
Add to <code>opencode.json</code>:
<pre lang="json">{
  "mcp": {
    "exa": {
      "type": "remote",
      "url": "https://mcp.exa.ai/mcp",
      "enabled": true
    }
  }
}</pre>
</details></td>
<td><details><summary><b>Antigravity</b></summary><br>
Open the MCP Store panel (from the "..." dropdown in the side panel), then add a custom server with:
<pre>https://mcp.exa.ai/mcp</pre>
</details></td>
<td><details><summary><b>Windsurf</b></summary><br>
Add to <code>~/.codeium/windsurf/mcp_config.json</code>:
<pre lang="json">{
  "mcpServers": {
    "exa": {
      "serverUrl": "https://mcp.exa.ai/mcp"
    }
  }
}</pre>
</details></td>
</tr>
<tr>
<td><details><summary><b>Zed</b></summary><br>
Add to your Zed settings:
<pre lang="json">{
  "context_servers": {
    "exa": {
      "url": "https://mcp.exa.ai/mcp"
    }
  }
}</pre>
</details></td>
<td><details><summary><b>Gemini CLI</b></summary><br>
Add to <code>~/.gemini/settings.json</code>:
<pre lang="json">{
  "mcpServers": {
    "exa": {
      "httpUrl": "https://mcp.exa.ai/mcp"
    }
  }
}</pre>
</details></td>
<td><details><summary><b>v0 by Vercel</b></summary><br>
In v0, select <b>Prompt Tools</b> &gt; <b>Add MCP</b> and enter:
<pre>https://mcp.exa.ai/mcp</pre>
</details></td>
<td><details><summary><b>Warp</b></summary><br>
Go to <b>Settings</b> &gt; <b>MCP Servers</b> &gt; <b>Add MCP Server</b> and add:
<pre lang="json">{
  "exa": {
    "url": "https://mcp.exa.ai/mcp"
  }
}</pre>
</details></td>
</tr>
<tr>
<td><details><summary><b>Kiro</b></summary><br>
Add to <code>~/.kiro/settings/mcp.json</code>:
<pre lang="json">{
  "mcpServers": {
    "exa": {
      "url": "https://mcp.exa.ai/mcp"
    }
  }
}</pre>
</details></td>
<td><details><summary><b>Roo Code</b></summary><br>
Add to your Roo Code MCP config:
<pre lang="json">{
  "mcpServers": {
    "exa": {
      "type": "streamable-http",
      "url": "https://mcp.exa.ai/mcp"
    }
  }
}</pre>
</details></td>
<td><details><summary><b>Other Clients</b></summary><br>
For clients that support remote MCP:
<pre lang="json">{
  "mcpServers": {
    "exa": {
      "url": "https://mcp.exa.ai/mcp"
    }
  }
}</pre>
For clients that need mcp-remote:
<pre lang="json">{
  "mcpServers": {
    "exa": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.exa.ai/mcp"]
    }
  }
}</pre>
</details></td>
<td><details><summary><b>Via npm Package</b></summary><br>
Use the npm package with your API key. <a href="https://dashboard.exa.ai/api-keys">Get your API key</a>.
<pre lang="json">{
  "mcpServers": {
    "exa": {
      "command": "npx",
      "args": ["-y", "exa-mcp-server"],
      "env": {
        "EXA_API_KEY": "your_api_key"
      }
    }
  }
}</pre>
</details></td>
</tr>
</table>

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
