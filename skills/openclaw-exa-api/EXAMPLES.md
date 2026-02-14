# Exa Skill Examples

Use this file for concrete command patterns. Keep `SKILL.md` for execution rules and safety constraints.

## Search Examples

When to use: web lookup, entity discovery, domain-filtered search, people/company/news/paper workflows.

```bash
# Basic search
bash scripts/search.sh "AI agents 2024"

# Realtime UX / autocomplete
TYPE=instant bash scripts/search.sh "best ramen near me open now"

# High-quality general lookup
TYPE=auto bash scripts/search.sh "latest AI model release notes"

# Speed/quality balance
TYPE=fast bash scripts/search.sh "top battery recycling companies europe"

# Comprehensive search
TYPE=deep bash scripts/search.sh "long-term impact of solid-state batteries on EV supply chain"

# LinkedIn people search
CATEGORY=people bash scripts/search.sh "software engineer Amsterdam"

# Company search
CATEGORY=company bash scripts/search.sh "fintech startup Netherlands"

# Research paper search
CATEGORY="research paper" bash scripts/search.sh "transformer architecture"

# News from specific domains
CATEGORY=news DOMAINS="reuters.com,bbc.com" bash scripts/search.sh "Netherlands"

# Date-filtered news
CATEGORY=news SINCE="2026-01-01" UNTIL="2026-02-01" bash scripts/search.sh "tech layoffs"
```

Notes:
- With `CATEGORY=people`, `DOMAINS` only supports LinkedIn domains.
- With `CATEGORY=people` or `CATEGORY=company`, avoid `EXCLUDE`, `SINCE`, and `UNTIL`.

## Content Extraction and Crawling Examples

When to use: pull full text from known URLs, summarize pages, crawl related docs pages.

```bash
# Extract one or more URLs
bash scripts/content.sh "https://exa.ai/docs" "https://docs.exa.ai/"

# Increase text budget for richer downstream reasoning
MAX_CHARACTERS=10000 bash scripts/content.sh "https://exa.ai/docs/llms.txt" | jq

# Crawl docs subpages from a seed URL
SUBPAGES=10 SUBPAGE_TARGET="docs,reference,api" LIVECRAWL=preferred LIVECRAWL_TIMEOUT=12000 \
  bash scripts/content.sh "https://docs.exa.ai/" | jq
```

Notes:
- Prefer `https://docs.exa.ai/` as a crawl seed for docs subpages.
- `LIVECRAWL` accepts `preferred`, `always`, or `fallback`.

## Code Context Search Examples

When to use: find API usage examples, implementation patterns, and doc/code snippets.

```bash
# Default result count (10)
bash scripts/code.sh "Next.js partial prerendering config"

# Explicit result count
bash scripts/code.sh "Rust axum middleware auth example" 20
```

## Research Examples (Async)

When to use: multi-source synthesis, citation-heavy research, or structured output requirements.

### One-shot flow (create + poll)

```bash
bash scripts/research.sh "Compare the current flagship GPUs from NVIDIA, AMD, and Intel."
```

### One-shot with structured output

```bash
MODEL=exa-research-pro \
SCHEMA_FILE="./schema.json" \
POLL_INTERVAL=2 \
MAX_WAIT_SECONDS=300 \
EVENTS=true \
bash scripts/research.sh "Estimate the global battery recycling market size in 2030 by region."
```

### Two-step flow (manual control)

```bash
# Create
bash scripts/research_create.sh "Create a timeline of major OpenAI product releases from 2015 to 2023." | jq

# Capture researchId
RID="$(bash scripts/research_create.sh "Create a timeline of major OpenAI product releases from 2015 to 2023." | jq -r '.researchId')"

# Poll
bash scripts/research_poll.sh "$RID" | jq
```

Safety reminder:
- `SCHEMA_FILE` contents are uploaded as `outputSchema`.
- Never pass sensitive local files (for example: `.env`, private keys, certificate bundles, credential files).
