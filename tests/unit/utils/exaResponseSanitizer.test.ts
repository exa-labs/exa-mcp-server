import { describe, expect, it } from "vitest";
import {
  sanitizeContentsResponse,
  sanitizeDeepSearchStructuredResponse,
  sanitizeSearchResponse,
  stripSensitiveKeys,
} from "../../../src/utils/exaResponseSanitizer.js";

describe("exaResponseSanitizer", () => {
  it("removes sensitive keys recursively", () => {
    expect(
      stripSensitiveKeys({
        title: "Visible",
        requestTags: ["internal"],
        nested: {
          requestTags: { trace: "hidden" },
          keep: "value",
        },
      }),
    ).toEqual({
      title: "Visible",
      nested: {
        keep: "value",
      },
    });
  });

  it("keeps safe search fields and drops invalid or sensitive response data", () => {
    const sanitized = sanitizeSearchResponse({
      requestId: "request-1",
      resolvedSearchType: "auto",
      requestTags: { trace: "hidden" },
      results: [
        {
          id: "result-1",
          title: "Example",
          url: "https://example.com",
          highlights: ["useful highlight", 123],
          entities: [{ name: "Entity", requestTags: ["hidden"] }, "bad entity"],
          requestTags: ["hidden"],
        },
        "bad result",
      ],
      statuses: [
        { id: "https://example.com", status: "success", source: "search" },
        { id: "missing-source", status: "success" },
      ],
      costDollars: {
        total: 0.01,
        requestTags: ["hidden"],
      },
      searchTime: 0.12,
    });

    expect(sanitized).toEqual({
      requestId: "request-1",
      resolvedSearchType: "auto",
      statuses: [{ id: "https://example.com", status: "success", source: "search" }],
      results: [
        {
          id: "result-1",
          title: "Example",
          url: "https://example.com",
          highlights: ["useful highlight"],
          entities: [{ name: "Entity" }],
        },
      ],
      searchTime: 0.12,
      costDollars: {
        total: 0.01,
      },
    });
  });

  it("sanitizes contents responses through the same top-level response rules", () => {
    const sanitized = sanitizeContentsResponse({
      results: [
        {
          title: "Fetched",
          url: "https://example.com/fetched",
          text: "Body text",
          requestTags: ["hidden"],
        },
      ],
    });

    expect(sanitized).toEqual({
      results: [
        {
          title: "Fetched",
          url: "https://example.com/fetched",
          text: "Body text",
        },
      ],
    });
  });

  it("preserves structured deep search output content while sanitizing grounding", () => {
    const sanitized = sanitizeDeepSearchStructuredResponse({
      output: {
        content: { answer: "Structured answer", requestTags: ["preserved in content"] },
        grounding: [
          {
            field: "answer",
            confidence: "high",
            citations: [
              { url: "https://example.com", title: "Citation" },
              { url: "missing-title" },
            ],
          },
        ],
      },
      results: [{ title: "Result", url: "https://example.com" }],
    });

    expect(sanitized).toEqual({
      output: {
        content: { answer: "Structured answer", requestTags: ["preserved in content"] },
        grounding: [
          {
            field: "answer",
            confidence: "high",
            citations: [{ url: "https://example.com", title: "Citation" }],
          },
        ],
      },
      results: [{ title: "Result", url: "https://example.com" }],
    });
  });
});
