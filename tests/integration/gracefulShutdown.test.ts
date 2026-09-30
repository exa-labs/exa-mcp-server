/**
 * Graceful shutdown of the runtime entrypoint: on SIGTERM/SIGINT the server
 * stops accepting connections, finishes the tool call already in flight, and
 * exits cleanly well inside its drain timeout — without waiting out kept-alive
 * connections. A second signal exits without waiting for the drain.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  FakeExaApi,
  postMcp,
  searchResults,
  ServerProcess,
  waitFor,
  webSearchCall,
} from "./harness.js";

/** Far above the test's own wait, so a clean exit proves drain rather than the force-exit timer. */
const DRAIN_TIMEOUT_SECS = 60;
const UPSTREAM_DELAY_MS = 1_500;
/** Well under the 5s keep-alive timeout an idle client connection would otherwise hold the drain for. */
const EXIT_AFTER_DRAIN_MS = 2_500;

let exaApi: FakeExaApi;
let server: ServerProcess | undefined;

beforeAll(async () => {
  exaApi = await FakeExaApi.start();
});

afterEach(() => server?.stop());

afterAll(async () => {
  await exaApi.close();
});

describe("graceful shutdown", () => {
  it.each(["SIGTERM", "SIGINT"] as const)(
    "drains the in-flight tool call on %s, then exits 0",
    async (signal) => {
      exaApi.respondWith(() => ({
        status: 200,
        body: searchResults("https://exa.ai/"),
        delayMs: UPSTREAM_DELAY_MS,
      }));
      server = await ServerProcess.start({
        EXA_API_BASE_URL: exaApi.url,
        EXA_API_KEY: "",
        SHUTDOWN_TIMEOUT_SECS: String(DRAIN_TIMEOUT_SECS),
      });
      const inFlight = postMcp(server, webSearchCall("exa"), { "x-api-key": "caller-key" });
      await waitFor(() => exaApi.callsTo("/search").length === 1, "the upstream search call");

      server.signal(signal);
      await waitFor(
        () => server!.logs.includes(`Received ${signal}, shutting down`),
        "the shutdown log line",
      );

      await expect(fetch(`${server.url}/ping`)).rejects.toThrow();
      const reply = await inFlight;
      const drainedAt = Date.now();
      expect(reply.status).toBe(200);
      expect(JSON.stringify(reply.message?.result)).toContain("URL: https://exa.ai/");
      const exit = await server.exited;
      expect(exit).toEqual({ code: 0, signal: null });
      expect(Date.now() - drainedAt).toBeLessThan(EXIT_AFTER_DRAIN_MS);
    },
  );

  it("exits at once on a second signal instead of waiting for the drain", async () => {
    exaApi.respondWith(() => ({
      status: 200,
      body: searchResults("https://exa.ai/"),
      delayMs: DRAIN_TIMEOUT_SECS * 1000,
    }));
    server = await ServerProcess.start({
      EXA_API_BASE_URL: exaApi.url,
      EXA_API_KEY: "",
      SHUTDOWN_TIMEOUT_SECS: String(DRAIN_TIMEOUT_SECS),
    });
    const inFlight = postMcp(server, webSearchCall("exa"), { "x-api-key": "caller-key" });
    await waitFor(() => exaApi.callsTo("/search").length === 1, "the upstream search call");

    server.signal("SIGTERM");
    await waitFor(() => server!.logs.includes("Received SIGTERM, shutting down"), "shutdown");
    server.signal("SIGTERM");

    expect(await server.exited).toEqual({ code: 0, signal: null });
    expect(server.logs).toContain("Received SIGTERM again, exiting without waiting for the drain");
    await expect(inFlight).rejects.toThrow();
  });
});
