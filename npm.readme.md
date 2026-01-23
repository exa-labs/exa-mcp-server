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
      "type": "stdio",
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
claude mcp add exa -e EXA_API_KEY=your_api_key -- npx -y exa-mcp-server
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
codex mcp add exa -e EXA_API_KEY=your_api_key -- npx -y exa-mcp-server
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
| `web_search_exa` | Search the web and get clean content |
| `get_code_context_exa` | Find code snippets and docs from GitHub and StackOverflow |
| `company_research_exa` | Research companies by crawling their websites |

**Off by Default:**
| Tool | Description |
| ---- | ----------- |
| `web_search_advanced_exa` | Advanced search with filters |
| `deep_search_exa` | Deep search with query expansion |
| `crawling_exa` | Get content from a specific URL |
| `linkedin_search_exa` | Search for people on LinkedIn |
| `deep_researcher_start` | Start an AI researcher |
| `deep_researcher_check` | Check research status and get report |

Enable specific tools with the `--tools` flag:

```bash
npx -y exa-mcp-server --tools=web_search_exa,deep_search_exa
```

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
