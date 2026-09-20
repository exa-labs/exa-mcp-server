---
name: exa-agent
description: "Use Exa Agent for multi-step web research, list-building, enrichment, structured output, run continuation, and coverage validation, with optional Exa Connect providers: fiber, financial_datasets, similarweb, baselayer, affiliate, particle, jinko."
---

# Exa Agent Research

Operate Exa Agent through MCP for multi-step web research, list-building, enrichment, structured output, run continuation, and coverage validation. Required tool: `agent_run` (hosts may namespace it).

## Exa Connect providers

Pass `dataSources` to `agent_run` when premium partner data is needed. Self-serve providers only:

- `fiber`: B2B company, people, jobs, contact enrichment
- `financial_datasets`: ticker-based news for US public companies
- `similarweb`: website traffic estimates, rankings, competitor discovery
- `baselayer`: US business verification, officers, registrations, KYB
- `affiliate`: product catalog search, pricing, brands, merchant links
- `particle`: podcast transcript search with speaker attribution
- `jinko`: travel destination discovery ranked by fare

Do not suggest request-only providers unless the user says their Exa account already has them enabled.

## Decision tree

1. **Known rows + repeated same-shape enrichment at scale** → write a deterministic script against Exa APIs directly: bounded concurrency, exponential backoff on 429/5xx, checkpoints, stable JSON/CSV/TSV output, raw API errors preserved per row. Read the output file and synthesize from it. Do not loop hundreds of identical MCP calls by hand.
2. **Open-ended discovery, list-building, multi-hop research, or follow-up over previous work** → use Exa Agent. Define the objective and `outputSchema` before creating the run.

## Before creating a run

Write down: objective; universe (what qualifies); segments (geography, industry, persona, dates, asset class); coverage target (desired/max count and "good enough"); output fields; evidence requirements (URLs, source titles, dates, confidence); exclusions (prior results, disallowed entities). Convert relative time ("recent", "last 6 months", "post-IPO") to exact dates first.

## Schema rules

Use `outputSchema` for list-building, enrichment, finance/company research, and repeatable workflows:

- Top-level object; rows in a named array with `maxItems`.
- Include stable identifiers (company name, domain, LinkedIn URL, ticker, CIK), source/evidence fields, and confidence or rationale for fuzzy judgments.
- Keep `required` minimal; use `format: "uri"` / `"email"` / `"phone"` where apt.

Minimal example:

```json
{
  "type": "object",
  "properties": {
    "companies": {
      "type": "array",
      "maxItems": 50,
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "website": { "type": "string", "format": "uri" },
          "evidence_url": { "type": "string", "format": "uri" },
          "confidence": { "enum": ["low", "medium", "high"] }
        },
        "required": ["name", "website", "evidence_url"]
      }
    }
  },
  "required": ["companies"]
}
```

Name the provider-specific data in both query and schema so Agent uses the Connect provider instead of falling back to web search.

## Workflow

1. **Run**: call `agent_run`. Omit `effort` (default low); raise only when the user asks for depth or the task clearly needs it. Use `input.data` for known rows and `input.exclusion` for prior/disallowed entities. Save the returned `id` for continuation. If status is `"running"`, re-call with `runId` until `outputReady` is true. Zero Data Retention (ZDR): output only on the live stream (~750s MCP window); retry with lower effort or split the task — `previousRunId` is unavailable.
2. **Read**: wait for `outputReady` (or failed/cancelled); read both `output.structured` and `output.grounding`.
3. **Validate**: row count vs target, segment coverage, dedupe entities, evidence quality, gaps.
4. **Continue if needed**: `previousRunId` for narrowing, filling missing fields, another segment, validating a prior set, or "more like these"; add `input.exclusion`; segment broad universes into separate runs. Do not reuse `previousRunId` when the prior run failed or is still running, the task is unrelated, or clean independent coverage is needed — use fresh runs and aggregate yourself.
5. **Answer**: state what was done, present structured results, state coverage and limits. Prefer "best-effort discovery", "not exhaustive", "coverage strongest in X, weaker in Y"; avoid "all", "complete list", "exhaustive", "definitive" unless the universe was bounded, segments covered, duplicates resolved, evidence inspected, and unknowns disclosed.

## Failure handling

- **Run fails to start**: surface the HTTP error; fix schema/auth/input. No silent fallback to generic web search.
- **Run fails**: explain from the terminal status; create a corrected follow-up only when the fix is clear.
- **Wrong objective/schema mid-stream**: abort the call (server attempts upstream cancel), then create a corrected run.
- **Sparse output**: continue with `previousRunId`, add exclusions, segment the universe, tighten schema fields.
