<h1 align="center">
  <img src="assets/Exa.svg" alt="Exa" width="64" />
  <br>
  Exa MCP Server
</h1>

<p align="center">Connect AI agents to Exa for web search, content fetching, and multi-step research.</p>

<p align="center">
  <a href="https://cursor.com/en/install-mcp?name=exa&config=eyJ1cmwiOiJodHRwczovL21jcC5leGEuYWkvbWNwIn0="><img src="https://custom-icon-badges.demolab.com/badge/Install_in_Cursor-000000?style=for-the-badge&logo=cursor-ai-white" alt="Install in Cursor" /></a>
  <a href="https://vscode.dev/redirect/mcp/install?name=exa&config=%7B%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Fmcp.exa.ai%2Fmcp%22%7D"><img src="https://custom-icon-badges.demolab.com/badge/Install_in_VS_Code-007ACC?style=for-the-badge&logo=vsc&logoColor=white" alt="Install in VS Code" /></a>
  <a href="https://claude.com/plugins/exa"><img src="https://img.shields.io/badge/Claude_Plugin-C66140?style=for-the-badge&logo=claude&logoColor=white" alt="Install Claude Plugin" /></a>
  <a href="https://chatgpt.com/plugins/exa?open_in_app"><img src="https://img.shields.io/badge/Codex%2FChatGPT_Plugin-4A5BFE?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPjxwYXRoIGQ9Ik0yMi4yODE5IDkuODIxMWE1Ljk4NDcgNS45ODQ3IDAgMCAwLS41MTU3LTQuOTEwOCA2LjA0NjIgNi4wNDYyIDAgMCAwLTYuNTA5OC0yLjlBNi4wNjUxIDYuMDY1MSAwIDAgMCA0Ljk4MDcgNC4xODE4YTUuOTg0NyA1Ljk4NDcgMCAwIDAtMy45OTc3IDIuOSA2LjA0NjIgNi4wNDYyIDAgMCAwIC43NDI3IDcuMDk2NiA1Ljk4IDUuOTggMCAwIDAgLjUxMSA0LjkxMDcgNi4wNTEgNi4wNTEgMCAwIDAgNi41MTQ2IDIuOTAwMUE1Ljk4NDcgNS45ODQ3IDAgMCAwIDEzLjI1OTkgMjRhNi4wNTU3IDYuMDU1NyAwIDAgMCA1Ljc3MTgtNC4yMDU4IDUuOTg5NCA1Ljk4OTQgMCAwIDAgMy45OTc3LTIuOTAwMSA2LjA1NTcgNi4wNTU3IDAgMCAwLS43NDc1LTcuMDcyOXptLTkuMDIyIDEyLjYwODFhNC40NzU1IDQuNDc1NSAwIDAgMS0yLjg3NjQtMS4wNDA4bC4xNDE5LS4wODA0IDQuNzc4My0yLjc1ODJhLjc5NDguNzk0OCAwIDAgMCAuMzkyNy0uNjgxM3YtNi43MzY5bDIuMDIgMS4xNjg2YS4wNzEuMDcxIDAgMCAxIC4wMzguMDUydjUuNTgyNmE0LjUwNCA0LjUwNCAwIDAgMS00LjQ5NDUgNC40OTQ0em0tOS42NjA3LTQuMTI1NGE0LjQ3MDggNC40NzA4IDAgMCAxLS41MzQ2LTMuMDEzN2wuMTQyLjA4NTIgNC43ODMgMi43NTgyYS43NzEyLjc3MTIgMCAwIDAgLjc4MDYgMGw1Ljg0MjgtMy4zNjg1djIuMzMyNGEuMDgwNC4wODA0IDAgMCAxLS4wMzMyLjA2MTVMOS43NCAxOS45NTAyYTQuNDk5MiA0LjQ5OTIgMCAwIDEtNi4xNDA4LTEuNjQ2NHpNMi4zNDA4IDcuODk1NmE0LjQ4NSA0LjQ4NSAwIDAgMSAyLjM2NTUtMS45NzI4VjExLjZhLjc2NjQuNzY2NCAwIDAgMCAuMzg3OS42NzY1bDUuODE0NCAzLjM1NDMtMi4wMjAxIDEuMTY4NWEuMDc1Ny4wNzU3IDAgMCAxLS4wNzEgMGwtNC44MzAzLTIuNzg2NUE0LjUwNCA0LjUwNCAwIDAgMSAyLjM0MDggNy44NzJ6bTE2LjU5NjMgMy44NTU4TDEzLjEwMzggOC4zNjQgMTUuMTE5MiA3LjJhLjA3NTcuMDc1NyAwIDAgMSAuMDcxIDBsNC44MzAzIDIuNzkxM2E0LjQ5NDQgNC40OTQ0IDAgMCAxLS42NzY1IDguMTA0MnYtNS42NzcyYS43OS43OSAwIDAgMC0uNDA3LS42Njd6bTIuMDEwNy0zLjAyMzFsLS4xNDItLjA4NTItNC43NzM1LTIuNzgxOGEuNzc1OS43NzU5IDAgMCAwLS43ODU0IDBMOS40MDkgOS4yMjk3VjYuODk3NGEuMDY2Mi4wNjYyIDAgMCAxIC4wMjg0LS4wNjE1bDQuODMwMy0yLjc4NjZhNC40OTkyIDQuNDk5MiAwIDAgMSA2LjY4MDIgNC42NnpNOC4zMDY1IDEyLjg2M2wtMi4wMi0xLjE2MzhhLjA4MDQuMDgwNCAwIDAgMS0uMDM4LS4wNTY3VjYuMDc0MmE0LjQ5OTIgNC40OTkyIDAgMCAxIDcuMzc1Ny0zLjQ1MzdsLS4xNDIuMDgwNUw4LjcwNCA1LjQ1OWEuNzk0OC43OTQ4IDAgMCAwLS4zOTI3LjY4MTN6bTEuMDk3Ni0yLjM2NTRsMi42MDItMS40OTk4IDIuNjA2OSAxLjQ5OTh2Mi45OTk0bC0yLjU5NzQgMS40OTk3LTIuNjA2Ny0xLjQ5OTdaIi8+PC9zdmc+" alt="Install Codex/ChatGPT Plugin" /></a>
</p>

<p align="center">
  <a href="https://docs.exa.ai/reference/exa-mcp"><b>Documentation</b></a>
  &nbsp;·&nbsp;
  <a href="https://www.npmjs.com/package/exa-mcp-server"><b>NPM Package</b></a>
  &nbsp;·&nbsp;
  <a href="https://dashboard.exa.ai/api-keys"><b>Get your API key</b></a>
</p>

## Installation

Connect to Exa's hosted MCP server:

```
https://mcp.exa.ai/mcp
```

Or use a plugin when your client supports one.

### Agent Plugin

This repository is an [Agent Plugin](https://agent-plugins.org). Install it with any [compatible client](https://agent-plugins.org/compatible-clients).

### Claude

Install from the [Claude Plugin Marketplace](https://claude.com/plugins/exa), or run:

```bash
claude plugin install exa@claude-plugins-official
```

### Codex / ChatGPT

Install via [Plugins in ChatGPT](https://chatgpt.com/plugins/exa), or run:

```bash
codex mcp add exa --url https://mcp.exa.ai/mcp
```

### Other MCP Clients

Most clients can be configured manually with the standard `mcpServers` shape:

```json
{
  "mcpServers": {
    "exa": {
      "type": "streamable-http",
      "url": "https://mcp.exa.ai/mcp",
    }
  }
}
```

<details>
<summary><b>Client-specific configs</b></summary>

Exa MCP works with most other clients, point them at `https://mcp.exa.ai/mcp`.

| Client | Where to add it |
| --- | --- |
| Kiro | Use the [Kiro power](https://github.com/exa-labs/kiro-power-exa), or add manually to `~/.kiro/settings/mcp.json` |
| LM Studio | [Add to LM Studio](https://lmstudio.ai/install-mcp?name=exa&config=eyJ1cmwiOiJodHRwczovL21jcC5leGEuYWkvbWNwIn0%3D), or add manually to `mcp.json` |
| Replit | [Add to Replit](https://replit.com/integrations?mcp=) |
| Grok Build | `/marketplace` → install **Exa**, then `/mcp` to sign in |
| Gemini CLI | Add manually to `~/.gemini/settings.json` |
| OpenCode | Add manually to `opencode.json` |
| Windsurf | Add manually to `~/.codeium/windsurf/mcp_config.json` |
| Google Antigravity | Add manually to `mcp_config.json` |
| Zed | Add manually to `settings.json` under `context_servers` |
| Warp | [Settings → Agents → MCP servers](warp://settings/mcp) |
| v0 by Vercel | [Settings → MCP connections](https://v0.app/settings/mcp-connections) |

</details>

## Available Tools

### Default Tools

| Tool | Description |
| --- | --- |
| `web_search_exa` | Search the web for any topic and get clean, ready-to-use content |
| `web_fetch_exa` | Read a webpage's full content as clean markdown from one or more URLs |

### Optional Tools (enable via the `tools` parameter)

| Tool | Description |
| --- | --- |
| `agent_run` | Run an [Exa Agent](https://docs.exa.ai/reference/agent-api-guide) for multi-step research, list-building, enrichment, and structured output |
| `web_search_advanced_exa` | Advanced search with filters, domains, dates, highlights, summaries, and subpage crawling |

Enable tools by appending them to the MCP URL (this will replace the defaults, so include all you want):

```
https://mcp.exa.ai/mcp?tools=web_search_advanced_exa
https://mcp.exa.ai/mcp?tools=web_search_exa,web_fetch_exa,agent_run
```

Exa Agent requires authentication (OAuth or an [API key](https://dashboard.exa.ai/api-keys)).

## Agent Skills

Skills live in [`skills/`](./skills/) and load with Agent Plugin / Claude plugin installs.

| Skill | Path | Use when |
| --- | --- | --- |
| `search` | [`skills/search/`](./skills/search/SKILL.md) | Deep research, lead gen, competitive analysis, multi-step web investigation |
| `exa-agent` | [`skills/exa-agent/`](./skills/exa-agent/SKILL.md) | Exa Agent runs, enrichment, structured output, Connect providers |

Invoke from your client's skill UI (or `/skill-name` where supported). MCP-only setups still get the tools; skills add orchestration on top.

## Authentication

The hosted MCP server works anonymously with rate limits. For higher limits and access to Exa Agent, use either OAuth or an API key.

**OAuth** is preferred: most clients prompt you to sign in to Exa. To force the login flow (useful for shared connectors and plugins), use `https://mcp.exa.ai/mcp?login` or `https://mcp.exa.ai/mcp/oauth`.

If you prefer, you can get an API key from the [dashboard](https://dashboard.exa.ai/api-keys) and pass it on the URL as `?exaApiKey=…`. You can also send it as a `Authorization: Bearer …` header or an `x-api-key` header.

Built with ❤️ by Exa