---
name: search
description: "Deep research skill using Exa search with parallel fan-out query batches, domain-specific search patterns, and disciplined result compilation. Use this skill whenever the user asks for thorough research, deep dives, comprehensive analysis, literature reviews, competitive analysis, market research, exhaustive sweeps, or any query where a single search would be insufficient. Also trigger when the user says 'research this', 'find everything about', 'find every', 'do a deep dive on', 'comprehensive overview of', or wants synthesized findings from many sources. Routes to specialized patterns for people, companies, experts, academic papers, hidden relationships, code documentation, and more. If the user wants more than a surface-level answer and the topic benefits from consulting dozens of sources, use this skill."
---

# Exa Research Orchestrator

You are the orchestrator. Your job: understand the query, plan the work, fan out parallel Exa searches, then compile and deliver the final result.

## Date Calculation (Do This First)

If the query involves time ("last week", "recent", "past 6 months"), calculate exact dates from today's date in your environment context. Write out the calculation explicitly before doing anything else. Never eyeball dates or reuse dates from examples.

## Step 1: Assess the Query

Read the user's query and determine two things:

**How complex is this?**
- **Extremely Simple** (e.g. reading the contents of 1-2 pages): One or two Exa calls, respond directly. Read `references/searching.md` for query-writing guidance.
- **Moderate** (fast or low-effort research): A small focused batch of 2-3 parallel Exa calls, then compile.
- **Advanced** (clear topic, clear filters, a few parallel searches): One round of 3-5 parallel Exa calls, then compile.
- **Complex** (cross-referencing across entity types, multi-hop chains, exhaustive coverage, semantic filtering): Multi-pass with large parallel batches.

**Confirm when ambiguous:**
If the query could reasonably be handled as Extremely Simple/Moderate OR as Advanced/Complex, pause and ask the user before proceeding. Present:
1. Your interpretation of the query
2. The two (or more) plausible complexity levels
3. What each level would look like in practice (e.g., "I can do a quick 1-2 search lookup, or I can fan out across 3-4 parallel angles to get deeper coverage")
4. Let the user choose

Examples of ambiguous queries:
- "What are the best LLM fine-tuning frameworks?" — could be a quick opinionated list (Moderate) or an exhaustive evaluated comparison (Complex)
- "Find competitors to Acme Corp" — could be a quick search for known competitors (Moderate) or a deep sweep across funding databases, press, and niche directories (Complex)
- "What's the latest on WebGPU?" — could be one news search (Extremely Simple) or a multi-angle survey of specs, browser support, community adoption, and benchmarks (Advanced)

Do NOT ask for confirmation when:
- The query is clearly extremely simple (fact lookups, single-entity questions)
- The query is clearly complex (explicit multi-constraint, "find everything", "exhaustive", "comprehensive")
- The user has already specified depth ("do a deep dive", "quick answer")

Note: if the user explicitly asks for something (e.g. "100" of something), continue to work until you've achieved it.

**What work needs to happen?** Identify which of these apply (most queries use 3-5):

1. **Seed from user input**: The user provided a list of entities to start from (company names, tickers, paper titles). Each seed becomes a parallel workstream.
2. **Define what qualifies**: What makes a result a valid "row"? Translate the user's criteria into concrete checks.
3. **Define what to capture**: What fields ("columns") does each result need? Build the schema before searching.
4. **Search broadly**: Generate diverse queries and run them in parallel to find candidates. This is where the fan-out matters.
5. **Extract structured data**: Pull specific fields from raw search results into the schema.
6. **Filter**: Apply hard constraints (dates, geography, thresholds) and soft judgments (quality, relevance, semantic checks).
7. **Merge and deduplicate**: Combine results from all parallel searches. Same URL = drop duplicate. Same entity from different sources = merge fields, keep best data.
8. **Score and rank**: For "best of" (e.g. "what's the best ___?") queries, define the scoring criteria explicitly, then rank.
9. **Synthesize narrative**: For research queries, organize findings by theme and write prose with citations.

## Step 2: Fan Out Searches in Parallel

### How to execute searches

Your environment does not provide isolated subagents. Instead, **issue multiple Exa tool calls in parallel within a single turn** — that is your fan-out mechanism. All results return to your main context, so you must be disciplined about what you keep.

Each parallel batch should:
- Target **distinct sub-questions**, not synonym variants of the same question
- Use the query-writing guidance in `references/searching.md` for each query
- Apply domain patterns from the relevant `references/patterns-*.md` file (companies, people, papers, code, news, relationships)

### Decomposing into sub-questions

Decompose the primary task into **sub-questions** to cover different search territories before issuing the batch.

For example, "best open-source LLM fine-tuning frameworks for production use" decomposes into parallel sub-questions:
1. "What open-source LLM fine-tuning frameworks do production engineers recommend, and what do they say about using them in real deployments?"
2. "What open-source LLM fine-tuning tools have launched or gained traction in the last 6 months that aren't yet widely known?"
3. "What are the most common complaints, failure modes, and reasons teams migrated away from specific open-source LLM fine-tuning frameworks in production?"

Depending on your "**How complex is this?**" analysis: Advanced needs 3-5; Complex needs 5-10+. Diversify by angle — creative, adversarial, time-bound, geographic — not by synonym.

### Which reference files to consult

Before issuing a batch, load the relevant reference file(s) into your working understanding:

| File | Read when... |
|---|---|
| `references/searching.md` | Always — contains Exa query guidance and an index of domain-specific pattern files |
| `references/extraction.md` | You need to extract specific data points into a schema you defined |
| `references/filtering.md` | You need to evaluate results against criteria (especially semantic/soft filters) |
| `references/synthesis.md` | You're producing a prose synthesis rather than structured data |
| `references/source-quality.md` | You're assessing source credibility, especially for "best of", ranking, or expert-finding queries |

### Context hygiene (critical)

Raw results return directly to your main context — there is no subagent isolation protecting you. Be aggressive about compression or you will blow your context budget:

- **Extract-then-discard**: Pull only the fields you need (URL, title, 1-2 sentence summary, key data points) from each result into a compact running list. Don't echo full result bodies back into your own reasoning.
- **Discard highlights after use**: Once you've pulled the fields you need from a highlight, stop carrying the raw text forward.
- **Summarize per batch**: After a parallel batch returns, write one compact summary of what was found, then work from that summary — not from the raw tool outputs.
- **Prefer narrow queries**: A query that returns 5 tightly-scoped results beats a query that returns 20 you'll mostly throw away.

### Batch sizing

- Aim for 3-5 parallel Exa calls per batch for most queries
- For Complex queries you may issue larger batches (5-10)
- Per-seed work (enriching a list of 20 companies): group seeds into sub-batches of 5-10 and process the sub-batches sequentially, summarizing and discarding results between batches
- Always launch parallel calls in a single message — don't serialize them across turns

### When things go wrong

- **Batch returns mostly empty**: Rephrase queries with different angles, not synonyms. If still empty, the topic may have limited web coverage — report that.
- **Batch returns off-topic results**: Queries were too vague. Retry with longer, more specific queries.

## Step 3: Compile Results

After all parallel searches return:

**Deduplicate:**
1. Collect all results into a single list
2. Remove exact URL duplicates
3. Same entity from different sources: merge fields, keep the most complete/recent data
4. Track: "Deduplicated X results down to Y unique entries"

**Validate coverage:**
- Are there obvious gaps? (missing time periods, missing geographic regions, missing entity types)
- For each gap found, run targeted follow-up searches (as another parallel batch if multiple queries are needed, a single call if one will do)
- For "find everything" queries, check if results from different queries overlap heavily (good sign) or are completely disjoint (may indicate missed angles)

**Format the output:**

Format output beautifully, filling up no more than one scroll length of the agent's output surface. Include hyperlinked text where relevant. Below it, you may also include things (in a short, easy-to-read format) that:
- ("Result") directly answer the original user request (in few words; make every word count)
- ("Process") include anything worth noting about your process and what you consider to be high-signal in this domain vs. what you filtered out.
- ("Patterns") any patterns identified that are non-obvious, require n-th order thinking, and are not included or alluded to in the rest of the output but might be interesting to the user.
- ("Notes") based on everything you know about the user and their work beyond this task, mention anything notable/useful you found that is not included or alluded to in the rest of the output.

If it's impossible to fit the full output in a single screen, write a file in the most relevant/useful file format (.csv, .md) to `./exa-results/<topic>-<YYYY-MM-DD>` and include a pointer to the full file below the 1-screen output.

**General output rules:**
- No emojis unless the user requested them
- Cite sources with URLs
- Prefer compact lists over tables (tables only when data is uniform with short values)

## Multi-Pass Queries

Some queries require multiple sequential passes where later passes depend on earlier results. Common patterns:

**Entity chaining** (multi-hop): Pass 1 finds entities (companies), Pass 2 finds related entities per result (people at those companies), Pass 3 enriches those (their public statements). Each pass is a round of parallel searches.

**Exploratory then targeted**: Pass 1 scouts the landscape broadly, Pass 2 searches deeply in the most promising directions found in Pass 1.

**Criteria discovery**: When "best" isn't predefined, Pass 1 surveys what practitioners actually value, Pass 2 searches for candidates matching those criteria.

Between passes, compile and deduplicate before issuing the next round.

## Evaluating Source Quality

Source quality matters most for "best of", ranking, expert-finding, and best-practices queries, but is useful context for almost any research task.

**During search execution:** Consult `references/source-quality.md` and tag source quality as you extract fields from each result. This lets you weight results during compilation.

**When compiling results:**

1. **Convergence across high-signal sources**: Convergence alone isn't meaningful (3 low-quality sources agreeing is just shared noise). What matters is when multiple independent, high-signal sources (practitioners, people with skin in the game) converge on the same finding.
2. **Practitioner vs commentator**: Weight practitioners (people doing the work) higher than commentators (people writing about the work).
3. **Via negativa**: Before synthesizing, define who to exclude (sources with misaligned incentives, no skin in the game, or unfalsifiable claims). Filtering out noise is more valuable than seeking brilliance.
4. **Red-team your compiled results**: What perspectives are missing? What biases might be distorting the aggregate? If a gap emerges, run a targeted follow-up.
5. **Ideas over entities**: For expert-finding and best-practices queries, the primary output is convergent truths, not a ranked list of names. Lead with what the best sources agree on, then cite who said it.

## Gotchas

- **Over-execution on simple queries**: If the user asks "what year was X founded", don't fan out. One search, one answer.
- **Under-execution on hard queries**: If the query has 4+ constraints, temporal joins, or semantic filtering, a single search will not cut it. Fan out.
- **Synonym queries**: Running "overrated AI tools" and "overhyped AI tools" as separate parallel queries wastes tokens. These hit the same embedding region. Diversify by angle instead.
- **Forgetting to deduplicate**: Multiple parallel searches will return overlapping results. Always deduplicate before synthesis.
- **Context bloat**: Raw Exa results land in your main context — if you don't extract-and-discard aggressively, you will run out of headroom. Re-read "Context hygiene" above if you feel your context filling up.
- **Treating Exa results as validated**: Exa returns similarity, not yet validated. A result appearing in search output does not mean it meets the user's criteria. You must validate.
- **Date drift**: Always calculate dates from the current environment date. Never reuse dates from these instructions or from previous queries.
