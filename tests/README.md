# Tests

Vitest-based test suite for `exa-mcp-server`. Covers the prod tool surface, the
sanitizer/error/auth utilities, and the Smithery config-parsing entry point.

## Running

```bash
npm test                # full suite
npm run test:watch      # watch mode
npm run test:coverage   # v8 coverage report
npm run typecheck       # tsc --noEmit (covers tests/ via tsconfig.test.json)
```

The whole suite runs offline — no real Exa API hits, no network calls. All
external dependencies (`exa-js`, `agnost`, `jose`) are mocked.

## Layout

```
tests/
├── helpers/
│   ├── mcp-test-server.ts   In-memory Client↔Server harness via SDK InMemoryTransport.
│   └── exa-mock.ts          Drop-in mock for the `exa-js` module (Exa, ExaError).
├── fixtures/
│   └── exa-responses.ts     Realistic search/contents API response shapes.
└── integration/
    ├── server.test.ts             tools/list, resources/read, prompts/get.
    └── tools/
        ├── web_search_exa.test.ts
        └── web_fetch_exa.test.ts

src/
├── utils/
│   ├── exaResponseSanitizer.test.ts
│   ├── errorHandler.test.ts
│   └── auth.test.ts
├── tools/config.test.ts
└── index.test.ts                  Smithery entry — config parsing.
```

## How tests are organized

**Layer 1 — Unit tests** sit next to the source file (`src/**/*.test.ts`). They
target pure functions with no I/O: response sanitization, retry/backoff,
JWT parsing, header construction, Smithery config normalization.

**Layer 2 — In-memory MCP integration tests** (`tests/integration/**/*.test.ts`)
drive the real `initializeMcpServer()` through the SDK `Client` connected via
`InMemoryTransport.createLinkedPair()`. This exercises the same JSON-RPC
protocol surface as a real client without spawning a child process or framing
stdio. The pattern is canonical and is how `@modelcontextprotocol/servers` and
similar OSS MCPs test their tool layer.

For per-tool tests, `vi.mock('exa-js', ...)` swaps in `tests/helpers/exa-mock.ts`,
which lets us:
- Assert the exact outbound request payload (`endpoint`, `method`, `body`,
  `headers`) our tool constructed.
- Inject success / error responses, including `ExaError(429)` for rate-limit
  paths.

## Adding a tool test

1. Create `tests/integration/tools/<tool_name>.test.ts`.
2. Top of file:
   ```ts
   vi.mock("exa-js", () => import("../../helpers/exa-mock.js"));
   vi.mock("agnost", () => ({ trackMCP: vi.fn(), createConfig: vi.fn((c) => c), checkpoint: vi.fn() }));
   ```
3. In `beforeEach`, call `resetExaMock()`.
4. Build the harness with the tool enabled:
   ```ts
   server = await buildTestServer({ enabledTools: ["<tool_name>"], exaApiKey: "k" });
   ```
5. Set the canned Exa response with `setExaRequestImpl(...)`.
6. Send a `tools/call` and validate both the outbound request (via `requestSpy`)
   and the formatted result text.

## Out of scope (for now)

- **`api/mcp.ts` Vercel handler tests** — most of its logic lives in private
  functions (rate-limit method detection, IP extraction, auth method
  resolution, request handling). Testing through the public `handleRequest`
  would require mocking Upstash Redis, `mcp-handler`, and `jose` — deferred
  to a follow-up PR. The `auth.ts` JWT helpers it uses *are* covered by
  `src/utils/auth.test.ts`.
- **Real Exa API smoke tests** — would belong behind an opt-in
  `npm run test:live` script gated on `EXA_API_KEY` and run outside CI.
- **Spawn-based stdio E2E** — `InMemoryTransport` covers the same protocol
  surface and is faster and more reliable; spawn-based tests can be added
  pre-release behind an opt-in script.

## References

- Canonical in-memory pattern: <https://github.com/mkusaka/mcp-server-e2e-testing-example/blob/main/tests/e2e/sdk.spec.ts>
- MCP TS SDK `InMemoryTransport.createLinkedPair`: <https://ts.sdk.modelcontextprotocol.io/v2/classes/_modelcontextprotocol_server.index.InMemoryTransport.html>
