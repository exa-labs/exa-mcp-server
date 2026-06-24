# Agent Tool for Exa MCP Server — Design Brainstorm

## Context

The Exa Agent API (`POST /agent/runs`, `GET /agent/runs/:id`) is an async research agent that:
- Takes a `query`, optional `systemPrompt`, `input` (data/exclusion records), `outputSchema`, `effort`, and `dataSources`
- Creates a run that takes seconds to minutes depending on effort
- Returns: `output.text` (natural language), `output.structured` (validated JSON or null), `output.grounding` (field-level citations)
- `dataSources` enables Exa Connect providers: `fiber_ai`, `financial_datasets`, `similar_web`, `baselayer`, `affiliate`, `particle_news`, `jinko`

This tool should be **gated to authenticated users only** (API key or OAuth), similar to how `deep_search_exa` is gated via `config.userProvidedApiKey`.

---

## Decision 1: Tool Shape

### A. Start/Check Pattern (Recommended)

Two tools: `agent_start_exa` + `agent_check_exa`

```
agent_start_exa(query, effort?, dataSources?, outputSchema?, systemPrompt?, input?)
  → { runId, status: "queued" | "running", message: "poll with agent_check_exa" }

agent_check_exa(runId)
  → { status, output?, usage?, costDollars? }
```

**Pros:** Proven pattern (deep_researcher_start/check already does this). Non-blocking — MCP client polls at its own pace. Handles the full range of effort levels without timeout risk.
**Cons:** Two tools instead of one. Client must manage polling.

### B. Single Blocking Tool

One tool: `agent_exa` — creates run, polls internally until done, returns result.

**Pros:** Simplest client UX — one call, one answer.
**Cons:** Agent runs at `high`/`xhigh` effort take 30s–2min+. Risk of MCP transport timeout. No intermediate visibility. Not cancellable.

### C. Blocking with Timeout Fallback

One tool with internal polling up to ~30s. Returns result if done, or `{ runId, status: "running" }` if still going.

**Pros:** Good UX for quick runs (minimal/low effort). Falls back gracefully.
**Cons:** Inconsistent return shape. Still needs a check tool for the fallback, so it becomes B + half of A.

**Recommendation:** **Option A** — matches the existing deep researcher pattern and cleanly handles the async nature.

---

## Decision 2: Data Sources Parameter

### 1. Flat array of provider enum strings

```ts
dataSources: z.array(
  z.enum(["fiber_ai", "financial_datasets", "similar_web", "baselayer", "affiliate", "particle_news", "jinko"])
).optional()
  .describe("Exa Connect data providers to enable. Each enables all of that provider's tools for the run.")
```

The tool internally wraps each string into `{ provider: string }` before calling the API.

**Pros:** Minimal, easy for MCP clients. Discoverable — the enum is self-documenting.
**Cons:** If providers gain per-provider config later, needs migration.

### 2. Array of objects (matching API shape)

```ts
dataSources: z.array(z.object({
  provider: z.enum(["fiber_ai", ...])
})).optional()
```

**Pros:** Exact API match. Extensible for per-provider options.
**Cons:** More verbose for MCP clients (`[{"provider": "fiber_ai"}]` vs `["fiber_ai"]`).

### 3. Boolean flags per provider

```ts
enableFiberAi: z.boolean().optional()
enableSimilarWeb: z.boolean().optional()
// ... one per provider
```

**Pros:** Maximally discoverable — each provider is a separate parameter.
**Cons:** Doesn't scale. Pollutes the parameter list. Must update tool definition when providers change.

**Recommendation:** **Option 1** — flat string array. Simplest for MCP clients, and the wrapping to `{ provider }` is trivial.

---

## Decision 3: Structured Output Semantics

This is the core design question. The Exa Agent API supports `outputSchema` (a JSON Schema) that makes `output.structured` contain validated JSON. Without it, `output.structured` is null and you get `output.text` only.

In the MCP context, the tool returns text content blocks to a calling LLM. The question is how (or whether) to expose structured output.

### A. Text-only — no outputSchema

```ts
// Parameters:
{
  query: string,
  effort?: "minimal" | "low" | "medium" | "high" | "xhigh" | "auto",
  dataSources?: string[],
  systemPrompt?: string,
}

// Response: always text + citations
"## Answer\n\n{output.text}\n\n## Citations\n\n..."
```

**Semantics:** The agent always returns a natural-language answer. The calling LLM structures the result itself if needed.

**Pros:**
- Clean MCP semantics — tool returns human-readable text, which is what MCP tools do
- Avoids the composition awkwardness: outer LLM specifying a JSON schema for the inner agent to fill
- Data sources still work — the agent uses them for research, the text answer incorporates the data
- Simpler tool definition, less room for client errors

**Cons:**
- Loses the "validated structured output" power of the agent
- Data source results are only available via natural language, not as structured records
- Some use cases (e.g., "get me a table of companies from Fiber AI with their revenue") would benefit from structured output

### B. Full outputSchema pass-through

```ts
// Parameters:
{
  query: string,
  effort?: ...,
  dataSources?: string[],
  systemPrompt?: string,
  outputSchema?: Record<string, unknown>,  // JSON Schema
}

// Response when outputSchema provided:
JSON.stringify({ text: output.text, structured: output.structured, grounding: [...] })

// Response when no outputSchema:
"## Answer\n\n{output.text}\n\n## Citations\n\n..."
```

**Semantics:** MCP client can optionally request structured JSON by providing a JSON Schema.

**Pros:**
- Full agent API power
- Data source results can be returned as structured rows
- Follows the existing deepSearch pattern (which already has outputSchema)

**Cons:**
- Awkward composition: an LLM specifying a JSON Schema for another LLM to populate, serialized back as text for the first LLM to parse
- JSON Schema is complex to specify correctly via MCP tool parameters
- Dual return shape (text vs JSON) may confuse MCP clients
- MCP clients rarely need machine-readable JSON — they're LLMs that can parse text

### C. Simplified structured mode (boolean flag)

```ts
{
  query: string,
  effort?: ...,
  dataSources?: string[],
  systemPrompt?: string,
  structuredOutput?: boolean,  // When true, agent decides the schema
}
```

When `structuredOutput: true`, send `outputSchema: { type: "object" }` to the API.

**Pros:** Simpler UX than raw JSON Schema.
**Cons:** The generic `{ type: "object" }` schema gives the agent full discretion over shape — results may be inconsistent.

### D. Text-only but include raw data source records

```ts
// Response includes data source records as a separate section:
"## Answer\n\n{output.text}\n\n## Data Source Results\n\n{JSON from data providers}\n\n## Citations\n\n..."
```

**Semantics:** No outputSchema, but surface data source provider results (if available from the run's usage/output) in a structured-ish way within the text response.

**Pros:** Gets data source value without the outputSchema complexity.
**Cons:** This isn't how the API works — data source results are woven into the agent's text answer, not returned as separate records. Would require post-processing that may lose fidelity.

### E. Omit outputSchema initially, add later based on usage

Ship with text-only (Option A). If authenticated MCP users request structured output, add it in a follow-up.

**Pros:** Ship faster, learn from real usage.
**Cons:** May need to revisit the tool definition.

---

## Decision 4: Input Data (data/exclusion records)

The Agent API supports `input: { data: [...], exclusion: [...] }` for providing records to process and entities to exclude.

### 1. Include input parameter

```ts
input: z.object({
  data: z.array(z.record(z.string(), z.unknown())).optional(),
  exclusion: z.array(z.record(z.string(), z.unknown())).optional(),
}).optional()
```

**Pros:** Full API power. Useful for "enrich these companies" workflows.
**Cons:** Complex parameter for MCP clients. Data records are hard to specify in a chat context.

### 2. Omit input, add later

Keep the tool focused on query-based research. Input data is more of a programmatic API pattern.

**Pros:** Simpler tool definition.
**Cons:** Limits enrichment use cases.

**Recommendation:** **Omit initially.** Input data is a batch/programmatic pattern. MCP clients can describe exclusions in the query or systemPrompt.

---

## Decision 5: Effort Parameter

### 1. Expose full effort enum

```ts
effort: z.enum(["minimal", "low", "medium", "high", "xhigh", "auto"]).optional()
```

### 2. Simplified effort (low/medium/high/auto)

Drop `minimal` and `xhigh` for simplicity.

### 3. Omit, always use "auto"

**Recommendation:** **Option 1** — expose the full enum. Effort directly affects cost/latency and authenticated users should have control.

---

## Proposed Tool Definitions (combining recommendations)

### `agent_start_exa`

```ts
server.tool(
  "agent_start_exa",
  `Start an Exa Agent research run. The agent searches the web, reads pages, and produces a comprehensive answer.
Supports Exa Connect data sources for enriched results from specialized providers.
Returns a run ID — use agent_check_exa to poll for results.
Requires API key or OAuth authentication.`,
  {
    query: lenientString().describe("Natural language research query."),
    effort: z.enum(["minimal", "low", "medium", "high", "xhigh", "auto"]).optional()
      .describe("Cost/depth tradeoff. 'minimal' is fastest/cheapest, 'xhigh' is most thorough. Default: auto."),
    dataSources: z.array(
      z.enum(["fiber_ai", "financial_datasets", "similar_web", "baselayer", "affiliate", "particle_news", "jinko"])
    ).optional()
      .describe("Exa Connect data providers to enable for the run."),
    systemPrompt: z.string().max(32000).optional()
      .describe("Instructions for how the agent should process and format results."),
    // outputSchema: ??? (see Decision 3)
  },
  async ({ query, effort, dataSources, systemPrompt }) => { ... }
);
```

### `agent_check_exa`

```ts
server.tool(
  "agent_check_exa",
  `Check status and retrieve results from an Exa Agent run.
Keep calling with the same run ID until status is 'completed'.`,
  {
    runId: z.string().describe("The run ID returned from agent_start_exa."),
  },
  async ({ runId }) => { ... }
);
```

---

## Open Questions for Discussion

1. **Structured output**: Which approach (A–E) best fits the MCP use case? The composition of LLM→MCP→Agent→structured JSON→text→LLM feels awkward, but data sources may be less useful without it.

2. **Data source discoverability**: Should the tool description explain what each provider does? Or keep it minimal and let the LLM figure it out from the enum names?

3. **Naming**: `agent_start_exa` / `agent_check_exa` vs `exa_agent_start` / `exa_agent_check` vs `agent_run_exa` / `agent_result_exa`?

4. **Should this be 2 tools or 3?** A `agent_list_exa` tool to list previous runs could be useful for resuming context.
