import { ExaError } from "exa-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatToolError,
  RATE_LIMITED_META_KEY,
  retryWithBackoff,
  withTimeout,
} from "../../../src/utils/errorHandler.js";

describe("errorHandler", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats free MCP rate limits as an isError notice with API key setup guidance", () => {
    const result = formatToolError(new ExaError("Too many requests", 429), "web_search_exa", false);

    expect(result.isError).toBe(true);
    expect("_meta" in result && result._meta[RATE_LIMITED_META_KEY]).toBe(true);
    expect(result.content[0].text).toContain("free MCP rate limit");
    expect(result.content[0].text).toContain("https://dashboard.exa.ai/api-keys");
  });

  it("formats keyed 429s as normal Exa errors without the rate-limit marker", () => {
    const error = new ExaError("Too many requests", 429, "2026-04-29T12:00:00.000Z");

    expect(formatToolError(error, "web_search_exa", true)).toEqual({
      content: [
        {
          type: "text",
          text: "web_search_exa error (429): Too many requests\nTimestamp: 2026-04-29T12:00:00.000Z",
        },
      ],
      isError: true,
    });
  });

  it("keeps Exa error status and timestamp when rate limit guidance does not apply", () => {
    const result = formatToolError(
      new ExaError("Unauthorized", 401, "2026-04-29T12:00:00.000Z"),
      "web_search_exa",
      true,
    );

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: "web_search_exa error (401): Unauthorized\nTimestamp: 2026-04-29T12:00:00.000Z",
        },
      ],
      isError: true,
    });
  });

  it("formats unknown errors without throwing", () => {
    expect(formatToolError("boom", "web_fetch_exa")).toEqual({
      content: [{ type: "text", text: "web_fetch_exa error: boom" }],
      isError: true,
    });
  });

  it("retries transient Exa errors before resolving", async () => {
    vi.useFakeTimers();
    const fn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new ExaError("temporary failure", 500))
      .mockResolvedValueOnce("ok");

    const result = retryWithBackoff(fn);
    await vi.advanceTimersByTimeAsync(1000);

    await expect(result).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-transient Exa errors", async () => {
    const fn = vi.fn<() => Promise<string>>().mockRejectedValue(new ExaError("bad request", 400));

    await expect(retryWithBackoff(fn)).rejects.toThrow("bad request");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("resolves when the wrapped function completes before the timeout", async () => {
    vi.useFakeTimers();

    await expect(withTimeout(() => Promise.resolve("ok"), 1_000, "test operation")).resolves.toBe(
      "ok",
    );
  });

  it("rejects with the expected message when the timeout is exceeded", async () => {
    vi.useFakeTimers();
    const result = withTimeout(() => new Promise<string>(() => {}), 60_000, "web_search_exa");
    const assertion = expect(result).rejects.toThrow("web_search_exa timed out after 60s");

    await vi.advanceTimersByTimeAsync(60_000);

    await assertion;
  });

  it("stops retrying once the timeout has fired", async () => {
    vi.useFakeTimers();
    // Each attempt fails with a gateway timeout after 40s, so the second
    // attempt is still in flight when the 60s tool timeout fires.
    const fn = vi.fn<() => Promise<string>>(
      () =>
        new Promise((_, reject) => {
          setTimeout(() => reject(new ExaError("gateway timeout", 504)), 40_000);
        }),
    );

    const result = withTimeout(
      (signal) => retryWithBackoff(fn, 2, signal),
      60_000,
      "web_search_exa",
    );
    const assertion = expect(result).rejects.toThrow("web_search_exa timed out after 60s");

    await vi.advanceTimersByTimeAsync(60_000);
    await assertion;
    expect(fn).toHaveBeenCalledTimes(2);

    // Let the orphaned second attempt fail and the backoff elapse. No third
    // request should go out after the caller has already been given an error.
    await vi.advanceTimersByTimeAsync(120_000);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not wait out the backoff when the signal is already aborted", async () => {
    const controller = new AbortController();
    const fn = vi.fn<() => Promise<string>>(async () => {
      controller.abort();
      throw new ExaError("temporary failure", 503);
    });

    await expect(retryWithBackoff(fn, 2, controller.signal)).rejects.toThrow("temporary failure");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("propagates errors from the wrapped function", async () => {
    vi.useFakeTimers();
    const error = new Error("request failed");

    await expect(withTimeout(() => Promise.reject(error), 1_000, "test operation")).rejects.toBe(
      error,
    );
  });
});
