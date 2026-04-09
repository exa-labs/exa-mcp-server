
# Finding Signal

High-signal sources are people who do the work, not just talk about it. The goal: find the 3-5 sources that matter (not 100 that don't), and extract the ideas where multiple arbiters independently agree.

## Core Principles

- **Subtraction before addition** — filter out noise first, then validate what remains
- **Ideas over people** — the primary output is convergent truths, not a ranked list of names
- **Never settle** — if you can't find strong signal, keep digging

## When to Use

- "Find the best resources for learning X"
- "Who should I follow for Y?"
- "Find experts in Z"
- Research where identifying highest-signal sources matters

## The Process

```
1. Via Negativa       ← Define who to IGNORE (you think)
2. Discovery          ← Wide scan for candidates (agents)
3. Validation         ← 8-criteria scoring + verification (you think, agents verify)
4. Red Team           ← Attack your own list (you think)
5. Convergence        ← Extract ideas where 3+ agree (you think)
6. Output             ← Minimum viable set + rankings (you synthesize)
```

---

## Step 1: Via Negativa — Filter OUT First

Before searching, define who to IGNORE in this domain.

**Universal noise signals:**

| Signal | Why it disqualifies |
|--------|---------------------|
| No skin in the game | Theorists who don't do the work |
| Misaligned incentives | Paid to sell, not to be right |
| Outer scorecard | Optimizing for followers/reputation |
| Circular credentials | Validated only by peers in same bubble |
| Unfalsifiable claims | "Just follow your passion" — can't be tested |
| Positive-only advice | No tradeoffs, no failure modes discussed |
| Temporal decay | Shifted from doing → teaching/selling |

**Write a 2-3 sentence noise profile for the domain before proceeding.**

---

## Step 2: Discovery — Wide Scan

Goal: surface 20-30 candidate names quickly. Don't go deep yet — just names, one-line reasons, and key works.

**Spawn 2-4 agents with different angles:**

```
Agent prompt:
"Run these exact queries and return names mentioned, why they're cited, key works:
1. web_search_exa { "query": "best [domain] resources recommended by practitioners", "numResults": 25 }
2. web_search_exa { "query": "[domain] experts worth following curated list", "numResults": 20 }
3. web_search_exa { "query": "underrated [domain] actually useful", "numResults": 20 }
Return: names, why cited, key works"
```

**Angles to cover across agents:**
1. **Meta-sources** — who do respected people recommend?
2. **Practitioners** — who has the best results, not just best writing?
3. **Citation chains** — who do the arbiters cite?
4. **Lindy filter** — whose work has lasted 10+ years?
5. **Contrarian** — underrated sources, non-obvious backgrounds

**Field-specific search strategies:**

| Field | Strategy | Example query |
|-------|----------|---------------|
| Engineering | Target personal blogs, GitHub | `"detailed technical post [topic] engineer"` |
| Startups/growth | Target practitioner essays | `"[topic] lessons building startup"` |
| Research/academic | Target papers then check citations | `"[topic] seminal paper survey"` |
| Finance | Target investor letters, analysis | `"[topic] analysis investor memo"` |
| Marketing | Target case studies with numbers | `"[topic] case study real results"` |

**Cross-reference:** Names appearing independently across multiple agents = highest signal.

**Builders vs. writers:** Writers get indexed. Builders often don't. If discovery only surfaces content creators, add a "builders" pass:

```
web_search_exa {
  "query": "[topic] built shipped tool open source creator",
  "numResults": 20
}
```

---

## Step 3: Validation — 8-Criteria Test

Take the top 8-10 candidates. Score each:

| # | Criteria | Question |
|---|----------|----------|
| 1 | Skin in the game | Did they succeed from DOING the thing? |
| 2 | Fiduciary gene | Do they serve something larger than themselves? |
| 3 | Circle of competence | Do they know what they DON'T know? |
| 4 | Inner scorecard | Internal conviction or external validation seeking? |
| 5 | Grandmother test | Is this just rediscovered common sense? |
| 6 | Anti-resume | Did they succeed despite not looking the part? |
| 7 | Generosity | Do they teach freely or gatekeep/paywall? |
| 8 | Track record | Years of verifiable results? |

**Scoring:** 6+ pass = High signal. 4-5 = Conditional. Below 4 = Noise.

**Additional checks:**

- **Temporal decay:** Are they STILL doing it, or shifted to teaching/advising?
- **Falsifiability:** "What evidence would prove their core claim wrong?" Clear answer = strong.

**Verification searches:**

```
// Who cites them?
web_search_exa { "query": "as [name] said about [topic]", "numResults": 15 }

// Track record?
web_search_exa { "query": "[name] results portfolio case study", "numResults": 15 }

// Criticism?
web_search_exa { "query": "[name] wrong criticism overrated", "numResults": 15 }
```

---

## Step 4: Red Team — Attack Your Own List

1. **Why might each candidate be overrated?**
2. **What perspectives are MISSING?** (Non-US voices? Practitioners who don't write? Enterprise vs indie?)
3. **What biases might be distorting results?** (Recency? Platform? Survivorship?)
4. **Strongest counterargument to each arbiter's core claim?**

If red teaming reveals a missing perspective, run additional discovery searches.

---

## Step 5: Extract Key Insights — THE PRIMARY OUTPUT

### Key Insights (ideas where 3+ agree)

Find ideas where 3+ independent sources agree. These are higher-confidence than any single opinion.

Example:
> **Optimize for output, not capture**
> Matuschak, Ahrens, and Forte all independently emphasize that most note-taking systems fail because they optimize for collecting rather than producing.

### Where Experts Disagree

Where strong sources genuinely disagree, explain when each side applies.

### Start Here (the 2-3 sources that matter)

**"If you could only follow 2-3 sources, which cover 80% of the domain's useful knowledge?"**

---

## Step 6: Output Format

**Lead with the answer, then show the work.**

```markdown
## [Domain]

**TL;DR:** [One sentence: the 2-3 names and the core insight]

---

### Key Insights

**[Idea — concise, actionable]**
[1-2 sentences with names inline as evidence]

---

### Start Here

| Who | Why they're worth following | Best starting point |
|-----|----------------------------|---------------------|
| [Name] | [1-line reason] | [book/blog/link] |

---

### Where Experts Disagree

**[Topic]:** [Position A] vs [Position B]. [When each applies].

---

### How We Found These

**Filtered out:** [1-liner: who was excluded and why]

**Evaluated:**
- Name A — [1-line reason they qualified or didn't]

**What's missing:** [Perspectives not covered]
```

---

## Common Mistakes

- **Listing people instead of ideas** — If your output is "here are 12 people" without convergent truths, you've failed
- **Settling for weak candidates** — Spawn more agents with different angles, don't lower the bar
- **Skipping via negativa** — Defining who NOT to trust is more valuable than seeking brilliance
- **Skipping red team** — Confirmation bias is the default
- **Popularity ≠ signal** — Famous names fail the filter constantly
- **Teacher bias** — Good communicators with no results are noise
