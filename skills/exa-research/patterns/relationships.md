
# Finding Hidden Relationships

## Purpose

Find connections between people or organizations that aren't explicitly listed anywhere. The relationship exists but must be inferred from indirect signals.

## Use Cases

| Subject | Looking for | Example |
|---------|-------------|---------|
| Person | Clients/patients | "Who are Phil Stutz's clients?" |
| Person | Mentees/students | "Who has Naval Ravikant mentored?" |
| Person | Collaborators | "Who worked with Andy Warhol?" |
| Company | Customers (B2B) | "Who are Stripe's enterprise clients?" |
| Company | Partners | "Who does OpenAI partner with?" |
| Group | Hidden members | "Who's in the PayPal Mafia beyond the famous ones?" |

## The Challenge

Direct queries often fail:
```
web_search_exa { "query": "[subject] [connection type]" }
// Returns articles ABOUT them, not actual connections
```

You need indirect signals.

## Phase 1: Subject's Own Platforms (Start Here)

Before indirect searches, exhaust what the subject publishes themselves. One scrape can find what 20 indirect queries would miss.

### Check for:
1. **Their website** → team pages, testimonials, case studies, partner lists
2. **Their podcast** → guest names in episode titles
3. **Their blog** → "A Conversation with X" posts
4. **Pages about them** → profiles, interviews where they name-drop
5. **Training/event pages** → speakers, participants

### Queries:
```
// Find their platforms first
web_search_exa { "query": "[subject] official website blog podcast", "numResults": 15 }

// Search within their content
web_search_exa {
  "query": "[subject] conversation interview testimonial guest",
  "numResults": 30
}

// Deep read their site
web_fetch_exa { "urls": ["https://subject-website.com/blog", "https://subject-website.com/about"] }
```

### For B2B (Company → Customers):
```
// Case studies are goldmines
web_search_exa { "query": "[company] case study customer success story", "numResults": 30 }

// Deep read case study pages
web_fetch_exa { "urls": ["https://company.com/customers", "https://company.com/case-studies"] }

// Subprocessor lists (GDPR compliance reveals vendors)
web_search_exa { "query": "[company] subprocessor list", "numResults": 20 }
```

### For Startup → Investors:
```
// Founder LinkedIn announcements (highest signal)
web_search_exa {
  "query": "[founder name] raised investors seed funding announcement",
  "numResults": 30
}

// News coverage of rounds
web_search_exa {
  "query": "[company] seed round angel investors backed by",
  "numResults": 25
}
```

## Phase 2: Map Key Events

Identify events that reveal connections:

| Event Type | Why It Reveals | What to Search |
|------------|---------------|----------------|
| Documentary/Film | Credits, appearances | Who appeared? Who produced? |
| Book release | Acknowledgments | Who did they thank? |
| Podcast appearances | Host/guest relationships | Who interviewed them? |
| Awards/Recognition | Thank-you speeches | Acceptance content |
| Controversy | People defend or distance | Who spoke up? |
| Death/Major event | Grief reveals relationships | Public reactions, tributes |

```
// Documentary credits
web_search_exa {
  "query": "[documentary title] producers credits who appears",
  "numResults": 20
}

// Book acknowledgments
web_search_exa {
  "query": "[subject] book acknowledgments thanks foreword",
  "numResults": 15
}
```

## Phase 3: Direct Query

Cover the obvious:

```
web_search_exa { "query": "[subject] [connection type]", "numResults": 25 }
web_search_exa { "query": "[subject] [connection type] list", "numResults": 25 }
```

## Phase 4: Indirect Signals

### Testimonials & Gratitude

```
web_search_exa {
  "query": "personal blog [subject] changed my life testimonial",
  "numResults": 25
}

web_search_exa {
  "query": "[subject's method/book] testimonial personal story experience",
  "numResults": 25
}
```

### Duration Markers (High Confidence)

Time markers indicate real relationships — people don't fabricate decades:

```
web_search_exa {
  "query": "[subject] years decades longtime worked with known since",
  "numResults": 25
}
```

### Terminology Detection

Every methodology has unique jargon. People using insider terms publicly are likely connected:

```
// Find the terminology first
web_search_exa { "query": "[subject] method terminology concepts framework", "numResults": 20 }

// Then search for people using it (without subject's name)
web_search_exa { "query": "[unique term 1] [unique term 2] personal story", "numResults": 30 }
```

## Phase 5: Network Expansion

### Referral Chains

```
web_search_exa {
  "query": "[known connection] referred recommended [subject]",
  "numResults": 20
}

web_search_exa { "query": "how I found [subject] recommendation", "numResults": 25 }
```

### Co-Authors and Collaborators

```
web_search_exa { "query": "[subject] co-author foreword introduction by", "numResults": 20 }
```

## Phase 6: Deep Read

When you find promising pages, extract with `web_fetch_exa`:

```
web_fetch_exa {
  "urls": ["https://promising-url-1.com", "https://promising-url-2.com"],
  "maxCharacters": 5000
}
```

Extract: names mentioned, context for each (confirmed/implied/mentioned), other connected names.

## Confidence Levels

| Level | Definition | Evidence Needed |
|-------|------------|-----------------|
| **Confirmed** | Explicitly states relationship | Direct quote, interview, post |
| **Likely** | Strong indirect evidence | Personal tribute, duration markers, multiple signals |
| **Possible** | Single indirect signal | One mention, could be coincidence |
| **Rumored** | Unverified claim | Third-party claim, no confirmation |

## Anti-Patterns

| Approach | Why It Fails |
|----------|--------------|
| Direct "[subject] [connection type]" alone | Returns articles about them, not actual connections |
| Short generic queries | Too much noise |
| Skipping subject's own platforms | Miss the easiest wins |

**The fix:** Start with subject's own platforms and key events, then expand via indirect signals.
