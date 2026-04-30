import { ExaError } from "exa-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { formatToolError, retryWithBackoff } from "../../../src/utils/errorHandler.js";

describe("errorHandler", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats free MCP rate limits with API key setup guidance", () => {
    const result = formatToolError(new ExaError("Too many requests", 429), "web_search_exa", false);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("free MCP rate limit");
    expect(result.content[0].text).toContain("https://dashboard.exa.ai/api-keys");
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
});
