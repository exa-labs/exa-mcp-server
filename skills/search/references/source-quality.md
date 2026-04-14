# Evaluating Source Quality

When assessing sources during search and extraction, tag quality signals in your output so results can be weighted and ranked downstream.

## Noise Signals -- Filter Out First

Before deep-reading, check for these disqualifiers:

| Signal | What to look for |
|--------|-----------------|
| No skin in the game | Theorists who don't do the work -- no portfolio, no shipped products, no verifiable results |
| Misaligned incentives | Paid to sell, not to be right (sponsored content, vendor blogs, affiliate-heavy) |
| Circular credentials | Validated only by peers in the same bubble -- no external evidence of impact |
| Positive-only advice | No tradeoffs, no failure modes discussed -- "just do X" with no caveats |
| Temporal decay | Shifted from doing to teaching/advising. Check: are they still actively building/practicing? |

## Practitioner vs Commentator

The most important distinction. Practitioners do the work; commentators write about the work.

**Practitioner signals:** shipped products, open-source contributions, case studies with specific numbers, "we built X and here's what happened"

**Commentator signals:** roundup posts, "top 10" lists, content primarily linking to others' work, no first-hand experience described

Note this distinction in your quality tags.

## Verification Searches

When validating a source's credibility (for expert-finding and best-of queries):

```
// Who cites them?
web_search_exa { "query": "[name] recommended by experts practitioners", "numResults": 5 }

// Track record?
web_search_exa { "query": "[name] results portfolio case study shipped", "numResults": 5 }

// Criticism?
web_search_exa { "query": "[name] criticism overrated wrong", "numResults": 5 }
```

Only run verification searches when the task specifically calls for evaluating source credibility. For standard search tasks, just tag what you observe from the content you already have.

## Tagging in Output

For each source, include a short free-form `quality` string describing what you observed -- e.g. "shipped the product, writes from direct experience" or "roundup blog, no original work shown, links to others." Don't classify into categories. Just describe what you see so the signal is preserved for downstream ranking.
