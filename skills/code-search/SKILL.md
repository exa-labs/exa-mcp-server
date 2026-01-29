---
name: get-code-context-exa
description: Code context using Exa. Finds real snippets and docs from GitHub, StackOverflow, and technical docs.
triggers:
  - code search
  - code snippet
  - api syntax
  - library docs
  - stackoverflow
  - github example
  - fix my code
  - exa-code
requires_mcp: exa
context: fork
---

# Code Context (Exa)

## Tool Restriction (Critical)

ONLY use `get_code_context_exa`. Do NOT use other Exa tools.

## Token Isolation (Critical)

Never run Exa in main context. Always spawn Task agents:
- Agent calls `get_code_context_exa`
- Agent extracts the minimum viable snippet(s) + constraints
- Agent deduplicates near-identical results (mirrors, forks, repeated StackOverflow answers) before presenting
- Agent returns copyable snippets + brief explanation
- Main context stays clean regardless of search volume

## When to Use

Use this tool for ANY programming-related request:
- API usage and syntax
- SDK/library examples
- config and setup patterns
- framework "how to" questions
- debugging when you need authoritative snippets

## Inputs (Supported)

`get_code_context_exa` supports:
- `query` (string, required)
- `tokensNum` (number, optional; default ~5000; typical range 1000–50000)

## Query Writing Patterns (High Signal)

To reduce irrelevant results and cross-language noise:
- Always include the **programming language** in the query.
  - Example: use **"Go generics"** instead of just **"generics"**.
- When applicable, also include **framework + version** (e.g., "Next.js 14", "React 19", "Python 3.12").
- Include exact identifiers (function/class names, config keys, error messages) when you have them.

## Dynamic Tuning

Token strategy:
- Focused snippet needed → tokensNum 1000–3000
- Most tasks → tokensNum 5000
- Complex integration → tokensNum 10000–20000
- Only go larger when necessary (avoid dumping large context)

## Output Format (Recommended)

Return:
1) Best minimal working snippet(s) (keep it copy/paste friendly)
2) Notes on version / constraints / gotchas
3) Sources (URLs if present in returned context)

Before presenting:
- Deduplicate similar results and keep only the best representative snippet per approach.

## MCP Configuration

```json
{
  "servers": {
    "exa": {
      "type": "http",
      "url": "https://mcp.exa.ai/mcp?tools=get_code_context_exa"
    }
  }
}
```
