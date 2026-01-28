---
name: people-search-exa
description: People search using Exa. Finds public profiles across the web (social + professional) and returns structured results with sources.
triggers: people search, find a person, find experts, find candidates, recruiting research, sales prospecting, find social profiles, person lookup.
requires_mcp: exa
context: fork
---

# People Search (Exa)

## Tool Restriction (Critical)

ONLY use `people_search_exa`. Do NOT use other Exa tools.

Note: If the user asks for `linkedin_search_exa`, use `people_search_exa` instead—it covers LinkedIn and other social/professional profiles.

## Token Isolation (Critical)

Never run Exa searches in main context. Always spawn Task agents:

- Agent calls `people_search_exa`
- Agent merges + deduplicates results (by URL AND near-duplicates) before presenting
- Agent extracts only what’s needed (name, role, company, location, profile URLs, key evidence)
- Agent returns distilled output (brief markdown or compact JSON)
- Main context stays clean regardless of search volume

## When to Use

Use `people_search_exa` when you need **broad people discovery** across the web, such as:
- Discover people by role + company + region (sales/recruiting)
- Find experts by topic (e.g., “incident response consultants specializing in AWS”)
- Build shortlists of candidates/prospects with certain skills

If the user needs general web sources or long-form articles, use a web search tool instead.

## Inputs (Supported)

`people_search_exa` supports:
- `query` (string, required)
- `numResults` (number, optional)

## Query Hygiene (Improves Precision)

People Search works best with **attribute-rich** queries. Encourage the user (or infer) these attributes:
- Role/title + seniority (e.g., “Staff”, “Director”, “VP”)
- Company (current or prior)
- Region/time zone/market (optional but helpful)
- Skills/stack/domain keywords
- Industry (optional)

Examples:
- "enterprise account executives from Microsoft in EMEA"
- "VP of Product at Microsoft"
- "Rust compiler engineers Europe"
- "cloud security consultants incident response AWS"

## Dynamic Tuning

Avoid hardcoding result counts. Tune dynamically:
- Find a single known person → `numResults` 3–8
- “a few” → `numResults` 10–20
- “comprehensive” / shortlist building → `numResults` 20–50, then post-filter

## Query Variation

Generate 2–3 query variations for coverage, run in parallel, then merge + dedupe.
Good variation strategies:
- title synonyms (VP/Head/Director)
- adding/removing location
- swapping skill keywords (e.g., “GenAI” ↔ “LLMs”)

## Output Format (Recommended)

Return:
1) Results (structured list; one person per row)
2) Sources (URLs; 1-line relevance each)
3) Notes (uncertainty/conflicts)

Before presenting:
- Deduplicate similar results (mirrors/reposts/profile variants) and keep the best representative source per person.

## Browser Fallback

Auto-fallback to browser automation when:
- Exa results are insufficient for identification
- A target page is auth-gated / dynamic
- User needs verification from a specific page that Exa can’t surface cleanly

Step 3: Ask User to Restart Claude Code

Ask the user to restart Claude Code to have the config changes take effect.
```

---

## Optional: VS Code MCP config

```json
{
  "servers": {
    "exa": {
      "type": "http",
      "url": "https://mcp.exa.ai/mcp?tools=people_search_exa"
    }
  }
}
```

---

## References

- Exa MCP: https://exa.ai/docs/reference/exa-mcp
- People Search launch: https://exa.ai/docs/changelog/people-search-launch
