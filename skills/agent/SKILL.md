---
name: exa-agent
description: Use Exa Agent for async, multi-step web research, list-building, enrichment, structured output, run continuation, and coverage validation. Exa Agent can access additional data providers, fiber_ai, financial_datasets, similar_web, baselayer, affiliate, particle_news, jinko
---

# Exa Agent Research

You are operating Exa Agent through MCP. Exa Agent is async and run-ID based: create a run, monitor status/events, retrieve output, and continue with follow-up runs when needed.

## Required tools

- `agent_create_run`
- `agent_wait_for_run`
- `agent_get_run_output`
- `agent_cancel_run`

## Exa Connect providers

When a run needs premium partner data alongside Exa web search, pass `dataSources` to `agent_create_run`.

Use only the currently usable self-serve providers:

- `fiber_ai`: B2B company, people, jobs, and contact enrichment
- `financial_datasets`: ticker-based news for US public companies
- `similar_web`: website traffic estimates, rankings, and competitor discovery
- `baselayer`: US business verification, officers, registrations, and KYB
- `affiliate`: product catalog search, pricing, brands, and merchant links
- `particle_news`: podcast transcript search with speaker attribution and timestamps
- `jinko`: travel destination discovery ranked by fare

Do not suggest request-only providers unless the user explicitly says their Exa account already has them enabled.

## Decision tree

Choose the work surface before acting:

1. Known input rows plus repeated same-shape enrichment at scale
   - Write a deterministic script using Exa APIs directly.
   - Use bounded concurrency, exponential backoff, checkpoints, and a stable output file.
   - Read the output file and synthesize from it.
   - Do not burn context manually looping over hundreds of identical tool calls.

2. Open-ended universe definition, list-building, people/company discovery, multi-hop research, structured research, or follow-up over previous work
   - Use Exa Agent.
   - Define the objective and `outputSchema` before creating the run.

## Before creating a run

Always write down:

- Objective: what the run is meant to answer.
- Universe: what entities qualify.
- Segments: geographies, industries, personas, dates, asset classes, or other partitions.
- Coverage target: desired count, maximum count, and what "good enough" means.
- Output fields: columns needed in the final answer.
- Evidence requirements: URLs, source titles, dates, and confidence.
- Exclusions: prior results or disallowed entities.

If the user uses relative time like "recent", "last 6 months", or "post-IPO", calculate exact dates from today's date first.

## Schema rules

Use `outputSchema` for list-building, enrichment, finance/company research, and repeatable workflows.

Rules:

- Use a top-level object.
- Put list rows in a named array field.
- Add `maxItems` to arrays when possible.
- Include source/evidence fields, not just conclusions.
- Include stable identifiers: company name, website/domain, person LinkedIn URL, ticker, CIK, etc.
- Include confidence or rationale fields for fuzzy judgments.
- Keep required fields limited to what must exist.
- Use `format: "uri"`, `format: "email"`, or `format: "phone"` when needed.

Example company-list schema:

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
          "company_name": { "type": "string" },
          "website": { "type": "string", "format": "uri" },
          "segment": { "type": "string" },
          "why_it_qualifies": { "type": "string" },
          "evidence_url": { "type": "string", "format": "uri" },
          "confidence": { "type": "string", "enum": ["low", "medium", "high"] }
        },
        "required": ["company_name", "website", "why_it_qualifies", "evidence_url"]
      }
    },
    "coverage_notes": { "type": "string" },
    "known_gaps": {
      "type": "array",
      "items": { "type": "string" }
    }
  },
  "required": ["companies", "coverage_notes"]
}
```

Example with Exa Connect:

```json
{
  "tool": "agent_create_run",
  "arguments": {
    "query": "Find 10 fast-growing B2B SaaS companies and return estimated monthly website visits from Similarweb.",
    "dataSources": [
      { "provider": "similar_web" }
    ],
    "outputSchema": {
      "type": "object",
      "properties": {
        "companies": {
          "type": "array",
          "maxItems": 10,
          "items": {
            "type": "object",
            "properties": {
              "name": { "type": "string" },
              "domain": { "type": "string" },
              "monthlyVisits": {
                "type": "number",
                "description": "Estimated monthly visits from Similarweb"
              }
            },
            "required": ["name", "domain", "monthlyVisits"]
          }
        }
      },
      "required": ["companies"]
    }
  }
}
```

## Exa Agent workflow

1. Create the run
   - Call `agent_create_run`.
   - Use `effort: "auto"` unless the user requests speed/depth.
   - Include `outputSchema` for structured work.
   - Use `input.data` for known rows.
   - Use `input.exclusion` for entities already returned or disallowed.
   - Add `dataSources` only when one of the self-serve Exa Connect providers is clearly useful.
   - Name the provider-specific data you want in both the query and the schema so Agent uses the provider instead of falling back to web search.

2. Save the run ID
   - Always keep the `agent_run_...` ID in your working notes.
   - Include run IDs in final reports.

3. Monitor
   - Prefer `agent_wait_for_run` with a bounded timeout.
   - If still running, call it again.
   - Treat `agent_wait_for_run` as the default status surface.

4. Retrieve output
   - When status is `completed`, call `agent_get_run_output`.
   - Read both `output.structured` and `output.grounding`.
   - Do not assume results are exhaustive just because the run completed.

5. Validate coverage
   - Check row count against target.
   - Check segment coverage.
   - Deduplicate entities.
   - Inspect evidence quality.
   - Identify gaps.

6. Continue if needed
   - Use `agent_create_run` with `previousRunId` for follow-up/refinement.
   - Use `input.exclusion` to avoid resurfacing prior results.
   - Segment large universes into multiple runs if one run is too broad.

7. Final answer
   - State what was done.
   - Include run IDs.
   - Present structured results.
   - State coverage and limitations.
   - Say "best-effort discovery" unless exhaustiveness was explicitly scoped and validated.

## Continuation patterns

Use `previousRunId` when:

- narrowing a list
- filling missing fields
- asking for another segment
- validating a prior set
- requesting "more like these"

Do not use `previousRunId` when:

- the prior run failed or is still running
- the new task is unrelated
- you need clean independent coverage for another segment

For independent segments, create separate runs and aggregate results yourself.

## Exhaustiveness and coverage language

Never claim exhaustive coverage unless all are true:

- The universe is bounded and well-defined.
- Search/discovery strategy covers the main segments.
- The output count and gaps were checked.
- Duplicates were resolved.
- Evidence was inspected.
- Any remaining unknowns are disclosed.

Preferred language when not fully validated:

- "best-effort discovery"
- "high-confidence initial universe"
- "not exhaustive"
- "coverage appears strongest in X and weaker in Y"

Avoid:

- "all companies"
- "complete list"
- "exhaustive"
- "definitive"

unless validation supports it.

## Batch Script Mode

If the task requires many parallel Exa calls of the same shape, especially batch enrichment over known companies/people:

1. Write a script instead of issuing many MCP calls manually.
2. The script must:
   - read deterministic inputs from a file
   - use bounded concurrency
   - use exponential backoff for 429/5xx
   - checkpoint partial progress
   - write deterministic JSON/CSV/TSV output
   - preserve raw API errors per row
3. Run the script.
4. Read the output file.
5. Synthesize from the output.

Use Exa Agent instead of Batch Script Mode when the hard part is discovery, reasoning, multi-hop research, or deciding what to search next.

## Failure handling

If create fails:

- Surface the HTTP error and fix schema/auth/input.
- Do not silently fall back to generic web search for Exa Agent-shaped work.

If wait times out:

- The run may still be healthy.
- Call `agent_wait_for_run` again.

If the run fails:

- Explain the failure from the returned terminal status.
- Create a corrected follow-up/new run only if the correction is clear.

If the run objective/schema is wrong:

- Cancel it with `agent_cancel_run`.
- Start a corrected run.

If output is sparse:

- Continue with `previousRunId`.
- Add exclusions for prior results.
- Segment the universe.
- Tighten or clarify schema fields.
