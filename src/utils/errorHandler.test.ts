import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("exa-js", () => import("../../tests/helpers/exa-mock.js"));

import { ExaError } from "exa-js";

import {
  formatToolError,
  handleRateLimitError,
  retryWithBackoff,
} from "./errorHandler.js";

beforeEach(() => {
  vi.useFakeTimers();
});

describe("retryWithBackoff", () => {
  it("returns immediately when fn succeeds", async () => {
    const fn = vi.fn(async () => "ok");
    const result = await retryWithBackoff(fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on transient ExaError (502) and succeeds on second attempt", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new ExaError("flap", 502))
      .mockResolvedValueOnce("ok");

    const promise = retryWithBackoff(fn);
    // Drain the 1s backoff timer.
    await vi.advanceTimersByTimeAsync(1000);
    expect(await promise).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry on non-transient ExaError (400)", async () => {
    const fn = vi.fn().mockRejectedValue(new ExaError("bad request", 400));
    await expect(retryWithBackoff(fn)).rejects.toMatchObject({ statusCode: 400 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does NOT retry on non-ExaError errors", async () => {
    const fn = vi.fn().mockRejectedValue(new TypeError("nope"));
    await expect(retryWithBackoff(fn)).rejects.toBeInstanceOf(TypeError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("gives up after maxRetries even on transient errors", async () => {
    const err = new ExaError("nope", 503);
    const fn = vi.fn().mockRejectedValue(err);

    const promise = retryWithBackoff(fn, 2);
    // Attach a rejection handler synchronously so the rejection isn't flagged
    // as unhandled while we drain the backoff timers.
    const settled = expect(promise).rejects.toBe(err);
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    await settled;
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });
});

describe("handleRateLimitError", () => {
  it("returns null for non-ExaError", () => {
    expect(handleRateLimitError(new Error("no"), false, "tool")).toBeNull();
  });

  it("returns null for non-429 ExaError", () => {
    expect(handleRateLimitError(new ExaError("no", 500), false, "tool")).toBeNull();
  });

  it("returns null when 429 but user provided their own API key", () => {
    expect(handleRateLimitError(new ExaError("rate", 429), true, "tool")).toBeNull();
  });

  it("returns the friendly free-tier message on 429 + free MCP", () => {
    const result = handleRateLimitError(new ExaError("rate", 429), false, "tool");
    expect(result).not.toBeNull();
    expect(result!.isError).toBe(true);
    expect(result!.content[0].text).toContain("Exa's free MCP rate limit");
    expect(result!.content[0].text).toContain("dashboard.exa.ai/api-keys");
  });
});

describe("formatToolError", () => {
  it("formats ExaError with statusCode and timestamp", () => {
    const err = new ExaError("boom", 502, "2025-04-29T00:00:00Z");

    const result = formatToolError(err, "web_search_exa", true);
    expect(result.isError).toBe(true);
    const text = result.content[0].text;
    expect(text).toContain("web_search_exa error (502): boom");
    expect(text).toContain("Timestamp: 2025-04-29T00:00:00Z");
  });

  it("formats generic Error", () => {
    const result = formatToolError(new Error("oops"), "web_search_exa");
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("web_search_exa error: oops");
  });

  it("delegates to handleRateLimitError when applicable", () => {
    const result = formatToolError(new ExaError("rate", 429), "web_search_exa", false);
    expect(result.content[0].text).toContain("Exa's free MCP rate limit");
  });
});
