---
name: web-search-exa
description: Web search using Exa. Retrieves a clean context string and summarizes with sources.
triggers: web search, browse web, find sources, research online, summarize articles, fact check, latest updates.
requires_mcp: exa
context: fork
---

# Web Search (Exa)

## Tool Restriction (Critical)

ONLY use `web_search_exa`. Do NOT use other Exa tools.

## Token Isolation

Use Task agents for multi-query research; run single queries directly for quick lookups.

For multi-query research, spawn Task agents:
- Agent calls `web_search_exa`
- Agent deduplicates and extracts URLs + key facts
- Agent returns only distilled output (brief markdown or compact JSON)

## Inputs (Supported)

`web_search_exa` supports:
- `query` (string, required)
- `numResults` (number, optional; default: 8)
- `livecrawl` ("fallback" | "preferred", optional; default: "fallback")
- `type` ("auto" | "fast" | "deep", optional; default: "auto")
- `contextMaxCharacters` (number, optional; default: 10000)

## Dynamic Tuning

No hardcoded result counts. Tune dynamically:
- quick answer → numResults 3–5, type "fast"
- normal research → numResults 8–12, type "auto"
- comprehensive → numResults 20+, type "deep"

Live crawl:
- default: "fallback"
- if user asks “latest/current” → set "preferred"

## Query Variation

Generate 2–3 query variations for coverage, run in parallel, then merge + dedupe by URL.

## Output Format (Recommended)

Return:
1) Answer (short, structured)
2) Sources (URLs, 1-line relevance each)
3) “What’s uncertain / conflicting” if needed


Step 3: Ask User to Restart Claude Code

Ask the user to restart Claude Code to have the MCP config changes take effect.
```

---

## Optional: VS Code MCP config

```json
{
  "servers": {
    "exa": {
      "type": "http",
      "url": "https://mcp.exa.ai/mcp?tools=web_search_exa"
    }
  }
}
```
