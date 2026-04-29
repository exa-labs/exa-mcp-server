import { describe, it, expect } from "vitest";

import {
  sanitizeContentsResponse,
  sanitizeSearchResponse,
  sanitizeSearchResult,
  stripSensitiveKeys,
} from "./exaResponseSanitizer.js";

describe("stripSensitiveKeys", () => {
  it("removes top-level requestTags", () => {
    const out = stripSensitiveKeys({ requestTags: { x: 1 }, keep: "yes" });
    expect(out).toEqual({ keep: "yes" });
  });

  it("removes nested requestTags recursively", () => {
    const out = stripSensitiveKeys({
      a: { requestTags: ["x"], inner: { requestTags: { y: 2 }, ok: 1 } },
    });
    expect(out).toEqual({ a: { inner: { ok: 1 } } });
  });

  it("walks arrays of objects", () => {
    const out = stripSensitiveKeys([
      { requestTags: "drop", keep: 1 },
      { keep: 2 },
    ]);
    expect(out).toEqual([{ keep: 1 }, { keep: 2 }]);
  });

  it("returns primitives unchanged", () => {
    expect(stripSensitiveKeys("hello")).toBe("hello");
    expect(stripSensitiveKeys(42)).toBe(42);
    expect(stripSensitiveKeys(null)).toBeNull();
  });
});

describe("sanitizeSearchResult", () => {
  it("returns null for non-records", () => {
    expect(sanitizeSearchResult("nope")).toBeNull();
    expect(sanitizeSearchResult([])).toBeNull();
  });

  it("keeps allowed string fields and drops unknown ones", () => {
    const out = sanitizeSearchResult({
      id: "abc",
      url: "https://x.com",
      author: "A",
      bogus: "drop me",
      requestTags: { drop: 1 },
    });
    expect(out).toEqual({ id: "abc", url: "https://x.com", author: "A" });
  });

  it("keeps title=null", () => {
    const out = sanitizeSearchResult({ url: "u", title: null });
    expect(out).toEqual({ url: "u", title: null });
  });

  it("filters non-string highlights and non-number highlightScores", () => {
    const out = sanitizeSearchResult({
      url: "u",
      highlights: ["ok", 5, null, "fine"],
      highlightScores: [0.1, "bad", 0.2],
    });
    expect(out).toEqual({
      url: "u",
      highlights: ["ok", "fine"],
      highlightScores: [0.1, 0.2],
    });
  });

  it("recursively sanitizes subpages", () => {
    const out = sanitizeSearchResult({
      url: "parent",
      subpages: [
        { url: "child", requestTags: "drop" },
        "garbage",
      ],
    });
    expect(out).toEqual({ url: "parent", subpages: [{ url: "child" }] });
  });

  it("sanitizes extras and drops empty extras", () => {
    const withLinks = sanitizeSearchResult({
      url: "u",
      extras: { links: ["a", 1], imageLinks: ["img"] },
    });
    expect(withLinks).toEqual({
      url: "u",
      extras: { links: ["a"], imageLinks: ["img"] },
    });

    const noLinks = sanitizeSearchResult({ url: "u", extras: { other: "x" } });
    expect(noLinks).toEqual({ url: "u" });
  });
});

describe("sanitizeSearchResponse", () => {
  it("strips requestTags from each result and from costDollars", () => {
    const out = sanitizeSearchResponse({
      requestId: "req",
      resolvedSearchType: "auto",
      results: [
        { url: "u", requestTags: { drop: 1 } },
        { url: "v" },
      ],
      costDollars: { total: 0.01, requestTags: "drop" } as unknown as Record<string, unknown>,
    });
    expect(out.results).toEqual([{ url: "u" }, { url: "v" }]);
    expect(out.costDollars).toEqual({ total: 0.01 });
  });

  it("drops unknown top-level fields", () => {
    const out = sanitizeSearchResponse({
      requestId: "req",
      resolvedSearchType: "auto",
      results: [{ url: "u" }],
      bogus: "drop",
    });
    expect(out).not.toHaveProperty("bogus");
    expect(out.requestId).toBe("req");
  });

  it("returns {} for non-records", () => {
    expect(sanitizeSearchResponse(undefined)).toEqual({});
    expect(sanitizeSearchResponse("garbage")).toEqual({});
  });

  it("sanitizes statuses array shape", () => {
    const out = sanitizeSearchResponse({
      results: [{ url: "u" }],
      statuses: [
        { id: "1", status: "ok", source: "live", extra: "drop" },
        { id: "2" }, // missing fields → dropped
      ],
    });
    expect(out.statuses).toEqual([{ id: "1", status: "ok", source: "live" }]);
  });
});

describe("sanitizeContentsResponse", () => {
  it("preserves searchTime and statuses", () => {
    const out = sanitizeContentsResponse({
      requestId: "r",
      results: [{ url: "u" }],
      searchTime: 42,
      statuses: [{ id: "u", status: "success", source: "live" }],
    });
    expect(out).toMatchObject({
      requestId: "r",
      searchTime: 42,
      statuses: [{ id: "u", status: "success", source: "live" }],
    });
  });
});
