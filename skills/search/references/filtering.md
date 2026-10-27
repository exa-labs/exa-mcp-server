# Filtering Results

After extracting data from search results, you may need to filter rows based on criteria from the original query. This file covers how to apply filters effectively.

## Hard Filters

Hard filters have clear, binary criteria: a date range, a geographic constraint, a numeric threshold, a category membership.

Apply these mechanically:
- Check each row against the criterion
- Remove rows that fail
- No judgment call needed

Examples: "published in 2025", "based in SF or NYC", "under $500B market cap", "excluding Novo Nordisk"

**Negation filters** ("excluding X", "not sponsored by Y") are hard filters applied in reverse. Check for the presence of the excluded value and remove matches.

## Soft Filters

Soft filters require judgment: "genuine design opinion" vs "generic blog post", "actually shipping" vs "just evaluating", "high-signal" vs "noise".

For these:
1. Read the relevant content (use `web_fetch_exa` if snippets are insufficient)
2. Make a judgment call based on the content
3. Include a brief rationale for each keep/drop decision so your reasoning is visible

**Semantic negation** is a type of soft filter: "no review mentions smell, noise, or pest complaints" requires reading review content and detecting whether these topics appear, even if phrased differently.

## Filter Order

Apply filters in this order to minimize wasted work:
1. **Hard filters first** -- cheap, mechanical, eliminates rows before you spend tokens on judgment
2. **Soft filters second** -- only on rows that passed hard filters

## Temporal Filters

Queries often involve time: "in the last 6 months", "began enrolling in 2025", "recent".

- Calculate exact date boundaries from the current date before filtering
- Check publication/event dates against the boundary
- If a date is ambiguous (e.g. "early 2025"), note the uncertainty rather than silently including or excluding

## Completeness vs Precision

The original query determines the balance:
- "Find every..." or "exhaustive" -- err on the side of including borderline cases, flag them as uncertain
- "Find the best..." or "top N" -- err on the side of precision, drop borderline cases
- Default: include borderline cases with a flag, let downstream processing decide
