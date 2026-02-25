---
name: exa-full
version: 1.2.1
description: Exa AI search + Research API. Supports web/code search, content extraction, and async multi-step research tasks with outputSchema.
homepage: https://exa.ai
metadata: {"openclaw":{"emoji":"🔍","requires":{"bins":["curl","jq"],"env":["EXA_API_KEY"]}}}
---

# Exa - Search + Research

Use this skill for web search, code-context search, URL content extraction, and async research workflows.

## What This Skill Does

- Run Exa web search with optional category and domain filters.
- Retrieve full page content (and optional subpage crawling).
- Find code and docs context for programming queries.
- Run async research tasks (one-shot or create/poll workflows).
- Support optional structured outputs via `outputSchema`.

## Setup

Set `EXA_API_KEY` using one of these methods.

```bash
export EXA_API_KEY="your-exa-api-key"
```

```bash
# .env next to SKILL.md
EXA_API_KEY=your-exa-api-key
```

Behavior:
- If `EXA_API_KEY` is missing in the environment, scripts load only `EXA_API_KEY` from `.env`.
- Other `.env` variables are ignored by the loader.

## Safety and Data Handling

- `SCHEMA_FILE` content is sent to `https://api.exa.ai/research/v1` as `outputSchema`.
- Never use sensitive local files for `SCHEMA_FILE` (for example: `.env`, key/cert files, secrets, internal confidential docs).
- `research_create.sh` blocks obvious sensitive paths/suffixes (for example: `.env`, `.pem`, `.key`, `.p12`, `.pfx`, `id_rsa`).

## Command Quick Reference

### Search

```bash
bash scripts/search.sh "query"
```

Main env vars:
- `NUM=10` (max 100)
- `TYPE=auto` (`auto`, `neural`, `fast`, `deep`, `instant`)
- `CATEGORY=` (`company`, `research paper`, `news`, `tweet`, `personal site`, `financial report`, `people`)
- `DOMAINS=domain1.com,domain2.com`
- `EXCLUDE=domain1.com,domain2.com`
- `SINCE=YYYY-MM-DD`
- `UNTIL=YYYY-MM-DD`
- `LOCATION=NL`

Constraints:
- `EXCLUDE` is not supported when `CATEGORY=company` or `CATEGORY=people`.
- `SINCE` and `UNTIL` are not supported when `CATEGORY=company` or `CATEGORY=people`.
- When `CATEGORY=people`, `DOMAINS` accepts LinkedIn domains only (`linkedin.com`, `www.linkedin.com`, `*.linkedin.com`).

### Content Extraction

```bash
bash scripts/content.sh "url1" "url2"
```

Main env vars:
- `MAX_CHARACTERS=2000`
- `HIGHLIGHT_SENTENCES=3`
- `HIGHLIGHTS_PER_URL=2`
- `SUBPAGES=10`
- `SUBPAGE_TARGET="docs,reference,api"`
- `LIVECRAWL=preferred` (`preferred`, `always`, `fallback`)
- `LIVECRAWL_TIMEOUT=12000`

### Code Context Search

```bash
bash scripts/code.sh "query" [num_results]
```

### Research (One-shot)

```bash
bash scripts/research.sh "instructions"
```

Main env vars:
- `MODEL=exa-research` or `MODEL=exa-research-pro`
- `SCHEMA_FILE=path/to/schema.json`
- `POLL_INTERVAL=2`
- `MAX_WAIT_SECONDS=240`
- `EVENTS=true`

### Research (Create/Poll)

```bash
bash scripts/research_create.sh "instructions" | jq
bash scripts/research_poll.sh "researchId" | jq
```

## Agent Decision Rules

### Choose `TYPE` for Search

Use this decision order:
1. User explicitly asks for realtime or autocomplete -> `TYPE=instant`.
2. Task needs broad coverage or deeper synthesis -> `TYPE=deep`.
3. User asks for speed/quality balance -> `TYPE=fast`.
4. Otherwise -> `TYPE=auto` (default).

Fallback/escalation:
- If too slow or time-sensitive: `deep -> auto -> fast -> instant`.
- If too shallow: `instant -> fast -> auto -> deep`.
- Explicit user requirement always wins.

Recommended pattern:

```bash
TYPE=auto bash scripts/search.sh "query"
```

## Common Pitfalls

- Do not pass sensitive files to `SCHEMA_FILE`.
- Do not combine `CATEGORY=people|company` with `EXCLUDE`, `SINCE`, or `UNTIL`.
- Prefer `https://docs.exa.ai/` for subpage crawling seeds (more reliable than `https://exa.ai/docs/reference/`).

## More Examples

See [EXAMPLES.md](EXAMPLES.md) for grouped command examples and edge-case workflows.
