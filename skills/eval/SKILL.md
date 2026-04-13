# eval Skill Design

## Overview

A skill that compares research quality between Claude's native web search and the Exa research skill. The user provides a query, and the skill runs it through both approaches in parallel, then generates a side-by-side HTML comparison page.

## Invocation

```
/eval <query>
```

Example: `/eval find me AI researchers with blogs about information retrieval`

## Architecture

### Flow

1. User runs `/eval <query>`
2. Skill dispatches two subagents in parallel:
   - **Baseline agent**: Uses only Claude's native `WebSearch` tool. No Exa tools. Told to research the topic thoroughly and return comprehensive markdown with sources.
   - **Skill agent**: Reads `skills/exa/SKILL.md` and follows the full exa orchestration (fan-out subagents, dedup, synthesis) using Exa MCP tools. Returns markdown results.
3. When both return, the skill:
   - Creates output directory: `results/evals/<query-slug>-<YYYY-MM-DD>/`
   - Writes `baseline.md` (raw baseline output)
   - Writes `skill.md` (raw skill output)
   - Generates `comparison.html` (self-contained HTML comparison page)
4. Opens `comparison.html` in the browser via `open` command

### Subagent Prompts

**Baseline agent prompt structure:**
- Receives the user's query
- Instructed to use `WebSearch` to research the topic
- Must return comprehensive markdown with findings and source URLs
- No access to Exa tools or skill files
- No specific methodology imposed — just "answer this research query thoroughly"

**Skill agent prompt structure:**
- Receives the user's query
- Instructed to read and follow `skills/exa/SKILL.md` (absolute path provided)
- Has access to Exa MCP tools (`web_search_exa`, `web_fetch_exa`)
- Follows the full orchestration: assess complexity, dispatch its own subagents if needed, compile, deduplicate, synthesize
- Returns final markdown output

### Output

**Directory structure:**
```
results/evals/
  ai-researchers-ir-blogs-2026-04-13/
    baseline.md
    skill.md
    comparison.html
```

**Query slug**: derived from the query — lowercase, spaces to hyphens, strip special chars, truncate to 50 chars.

**comparison.html** is a fully self-contained HTML file (no external dependencies):
- Header: query text, timestamp, date
- Two-column layout: "Claude Native Search" (left) vs "Exa Research Skill" (right)
- Both columns render their markdown content as HTML
- Includes a simple markdown-to-HTML renderer inline (handles headers, lists, bold, links, code blocks)
- Clean minimal styling, works in both light and dark system themes

### Skill File

Located at `skills/eval/SKILL.md` alongside the existing `skills/exa/` directory.

The SKILL.md file:
- Has frontmatter with name, description, and `context: fork`
- Contains the orchestration logic: parse the query from args, dispatch both subagents, collect results, generate files, open browser
- Generates the HTML inline using a template string (no build step, no external deps)
