# Exa MCP Server

[![npm version](https://badge.fury.io/js/exa-mcp-server.svg)](https://www.npmjs.com/package/exa-mcp-server)

Connect AI assistants to Exa's search capabilities using the npm package.

**[Get Your Exa API Key](https://dashboard.exa.ai/api-keys)** | **[Full Documentation](https://docs.exa.ai/reference/exa-mcp)** | **[GitHub](https://github.com/exa-labs/exa-mcp-server)**

## Installation

Install the npm package with your API key. **[Get your API key here](https://dashboard.exa.ai/api-keys)**.

<details>
<summary><b>Cursor</b></summary>

Add to `~/.cursor/mcp.json`:

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

<details>
<summary><b>VS Code</b></summary>

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
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

<details>
<summary><b>Claude Code</b></summary>

```bash
claude mcp add --transport stdio --env EXA_API_KEY=your_api_key exa -- npx -y exa-mcp-server
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
      "args": ["-y", "exa-mcp-server"],
      "env": {
        "EXA_API_KEY": "your_api_key"
      }
    }
  }
}
```
</details>

<details>
<summary><b>Codex</b></summary>

```bash
codex mcp add --env EXA_API_KEY=your_api_key exa -- npx -y exa-mcp-server
```
</details>

<details>
<summary><b>Windsurf</b></summary>

Add to `~/.codeium/windsurf/mcp_config.json`:

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

<details>
<summary><b>Zed</b></summary>

Add to your Zed settings:

```json
{
  "context_servers": {
    "exa": {
      "command": {
        "path": "npx",
        "args": ["-y", "exa-mcp-server"],
        "env": {
          "EXA_API_KEY": "your_api_key"
        }
      }
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

<details>
<summary><b>Kiro</b></summary>

Add to `~/.kiro/settings/mcp.json`:

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

<details>
<summary><b>Roo Code</b></summary>

Add to your Roo Code MCP config:

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

<details>
<summary><b>Other Clients</b></summary>

Standard `mcpServers` format:

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
| `web_fetch_exa` | Get the full content of a specific webpage from a known URL |

**Off by Default:**
| Tool | Description |
| ---- | ----------- |
| `web_search_advanced_exa` | Advanced web search with full control over filters, domains, dates, and content options |

**[Exa Agent](https://exa.ai/docs/reference/agent-api-guide) Tools** (optional, API key required):
| Tool | Description |
| ---- | ----------- |
| `agent_create_run` | Start an async Exa Agent run for multi-step research, list-building, enrichment, or structured output |
| `agent_wait_for_run` | Poll an Agent run until terminal status or timeout |
| `agent_get_run_output` | Retrieve completed text, structured output, grounding, usage, and cost |
| `agent_cancel_run` | Cancel a queued or running Agent run |

**Deprecated** (still available for backwards compatibility):

| Tool | Use instead |
| ---- | ----------- |
| `get_code_context_exa` | `web_search_exa` |
| `company_research_exa` | `web_search_advanced_exa` |
| `crawling_exa` | `web_fetch_exa` |
| `people_search_exa` | `web_search_advanced_exa` |
| `linkedin_search_exa` | `web_search_advanced_exa` |
| `deep_researcher_start` | [Research API](https://docs.exa.ai/reference/research/create-a-task) |
| `deep_researcher_check` | [Research API](https://docs.exa.ai/reference/research/get-a-task) |
| `deep_search_exa` | `web_search_advanced_exa` |

Enable additional tools with the `tools` parameter:

```
https://mcp.exa.ai/mcp?exaApiKey=YOUR_KEY&tools=web_search_exa,web_search_advanced_exa,web_fetch_exa
```

If you want to use Exa Agent, enable the optional toolset like so:

```
https://mcp.exa.ai/mcp?tools=agent_tools
```

If you want both search and Exa Agent tools enabled:

```
https://mcp.exa.ai/mcp?tools=web_search_exa,web_fetch_exa,agent_tools
```

See the [full documentation](https://docs.exa.ai/reference/exa-mcp) for more details on tool configuration.

## Remote MCP (Preferred)

For easier setup without an API key, use the hosted remote MCP server:

```
https://mcp.exa.ai/mcp
```

See the [full documentation](https://docs.exa.ai/reference/exa-mcp) for remote MCP setup instructions.

## Links

- [Get Your Exa API Key](https://dashboard.exa.ai/api-keys)
- [Documentation](https://docs.exa.ai/reference/exa-mcp)
- [GitHub](https://github.com/exa-labs/exa-mcp-server)
