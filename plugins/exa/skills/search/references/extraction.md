# Extracting Structured Data from Search Results

After running searches, you need to extract structured information from the results. This file covers how to do that well.

## When You Have Enough from Snippets

Exa search results include titles, URLs, and text snippets ("highlights"). For many fields (company name, person name, funding round, publication date), the snippet is sufficient. Extract directly from what you have before fetching full pages.

## When to Deep-Read with web_fetch_exa

Fetch the full page when:
- The snippet mentions what you need but doesn't include the actual value
- You need to read body text to make a judgment call (e.g. "does this blog post show genuine design opinion or is it generic?")
- You need to extract multiple fields from a single rich source (case study page, team page, filing)
- The task requires reading beyond the first few sentences

```
web_fetch_exa {
  "urls": ["https://source-1.com", "https://source-2.com"],
}
```

Batch up to 5-10 URLs per fetch call to minimize round trips. Avoid using `maxCharacters` param or `head`/`tail` bash tools; the point is to understand full page context.

## Extracting into a Schema

When you've been given a schema (the "columns" for the result), extract each field per result:

1. **Structured fields** (name, date, URL, funding amount, ticker): Extract the literal value. If not present, mark as missing rather than guessing.

2. **Categorical fields** (industry, stage, role level): Map to the closest category. Note uncertainty if the mapping is ambiguous.

3. **Semantic fields** (sentiment, whether something qualifies as "genuine opinion", relevance to a theme): Read the content and make a judgment call. Include a brief rationale so downstream synthesis can weigh your assessment.

4. **Negation fields** ("no review mentions X", "no Series A announcement"): These require checking that something is absent. Search for the positive case; if nothing surfaces, report absence with confidence level based on how thorough your coverage was.

## Handling Missing Data

- Mark fields as "not found" rather than guessing or leaving blank
- Distinguish "confirmed absent" (searched thoroughly, not there) from "not found" (didn't have access or coverage was limited)
- If a source is paywalled or inaccessible, note that explicitly

## Confidence Signals

When extracting, note the strength of the evidence:
- **Direct**: The source explicitly states the value (e.g. "We raised $20M in Series B")
- **Inferred**: The value is derived from context (e.g. headcount estimated from team page photos)
- **Uncertain**: Single indirect signal, could be wrong

## Output Format

Return extracted data as compact structured output. For lists of entities:

```
[
  { "name": "...", "field_1": "...", "field_2": "...", "source": "url", "confidence": "direct" },
  ...
]
```

Or as a markdown table if that better suits your task's instructions.

Keep output compact. Your results will be merged with results from other searches, so verbosity at this stage compounds.
