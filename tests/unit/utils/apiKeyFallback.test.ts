import { describe, expect, it, vi } from "vitest";

import { withApiKeyFallback } from "../../../src/utils/apiKeyFallback.js";
import { FakeMcpServer } from "../../helpers/fakeMcpServer.js";

const invalidKeyResult = {
  content: [{ type: "text", text: "web_search_exa error (401): x-api-key header is invalid" }],
  isError: true,
};

const okResult = { content: [{ type: "text", text: "results" }] };

describe("withApiKeyFallback", () => {
  it("retries once on the fallback credential when the API key is rejected", async () => {
    const handler = vi.fn().mockResolvedValueOnce(invalidKeyResult).mockResolvedValueOnce(okResult);
    const fallback = vi.fn().mockResolvedValue(true);
    const server = withApiKeyFallback(new FakeMcpServer(), fallback);

    server.tool("web_search_exa", "desc", {}, handler);
    const result = await server.getTool("web_search_exa").handler({ query: "q" }, { extra: 1 });

    expect(result).toBe(okResult);
    expect(fallback).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenNthCalledWith(2, { query: "q" }, { extra: 1 });
  });

  it("returns the rejection unchanged when no other credential is usable", async () => {
    const handler = vi.fn().mockResolvedValue(invalidKeyResult);
    const fallback = vi.fn().mockResolvedValue(false);
    const server = withApiKeyFallback(new FakeMcpServer(), fallback);

    server.registerTool("web_search_exa", { description: "desc" }, handler);
    const result = await server.getTool("web_search_exa").handler({ query: "q" });

    expect(result).toBe(invalidKeyResult);
    expect(fallback).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("leaves other tool errors alone", async () => {
    const upstream5xx = {
      content: [{ type: "text", text: "web_search_exa error (503): unavailable" }],
      isError: true,
    };
    const handler = vi.fn().mockResolvedValue(upstream5xx);
    const fallback = vi.fn().mockResolvedValue(true);
    const server = withApiKeyFallback(new FakeMcpServer(), fallback);

    server.tool("web_search_exa", "desc", {}, handler);
    const result = await server.getTool("web_search_exa").handler({ query: "q" });

    expect(result).toBe(upstream5xx);
    expect(fallback).not.toHaveBeenCalled();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      "a failed Agent run whose own error carries an auth status",
      {
        content: [
          {
            type: "text",
            text: '{"success":false,"id":"agent_run_1","status":"failed","error":{"message":"fiber provider error (403): Forbidden"}}',
          },
          { type: "text", text: "The Agent run failed." },
        ],
        structuredContent: { success: false, id: "agent_run_1", status: "failed" },
        isError: true,
      },
    ],
    [
      "a fetch failure for a URL that mentions unauthorized",
      {
        content: [
          {
            type: "text",
            text: "Error fetching URL(s): https://example.com/unauthorized: CRAWL_NOT_FOUND",
          },
        ],
        isError: true,
      },
    ],
    [
      "an error that only quotes a 401 further in",
      {
        content: [{ type: "text", text: "web_search_exa error: upstream said error (401): nope" }],
        isError: true,
      },
    ],
  ])("never falls back for %s", async (_label, result) => {
    const handler = vi.fn().mockResolvedValue(result);
    const fallback = vi.fn().mockResolvedValue(true);
    const server = withApiKeyFallback(new FakeMcpServer(), fallback);

    server.tool("agent_run", "desc", {}, handler);
    await expect(server.getTool("agent_run").handler({ query: "q" })).resolves.toBe(result);

    expect(fallback).not.toHaveBeenCalled();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("retries a thrown API-key rejection once, then lets the retry's outcome through", async () => {
    const unauthorized = Object.assign(new Error("Unauthorized"), { statusCode: 401 });
    const handler = vi.fn().mockRejectedValue(unauthorized);
    const fallback = vi.fn().mockResolvedValue(true);
    const server = withApiKeyFallback(new FakeMcpServer(), fallback);

    server.tool("web_search_exa", "desc", {}, handler);

    await expect(server.getTool("web_search_exa").handler({ query: "q" })).rejects.toBe(
      unauthorized,
    );
    expect(handler).toHaveBeenCalledTimes(2);
    expect(fallback).toHaveBeenCalledTimes(1);
  });
});
