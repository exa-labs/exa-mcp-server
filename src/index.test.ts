/**
 * Unit tests for the Smithery entry point's config-parsing logic.
 *
 * `default(config)` constructs an McpServer, normalizes `tools` / `enabledTools`,
 * and forwards them to `initializeMcpServer()`. We mock the handler so we can
 * assert exactly what the entry point computed without registering the real
 * tool surface or activating analytics.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { initializeMcpServer } = vi.hoisted(() => ({
  initializeMcpServer: vi.fn(),
}));

vi.mock("./mcp-handler.js", () => ({
  initializeMcpServer,
}));

vi.mock("agnost", () => ({
  trackMCP: vi.fn(),
  createConfig: vi.fn((c) => c),
  checkpoint: vi.fn(),
}));

import smitheryEntry from "./index.js";

beforeEach(() => {
  initializeMcpServer.mockReset();
});

describe("Smithery default export — tool config parsing", () => {
  it("parses comma-separated `tools` string", () => {
    smitheryEntry({
      config: { tools: "web_search_exa, web_fetch_exa", debug: false },
    });

    expect(initializeMcpServer).toHaveBeenCalledOnce();
    const passed = initializeMcpServer.mock.calls[0][1];
    expect(passed.enabledTools).toEqual(["web_search_exa", "web_fetch_exa"]);
  });

  it("treats `enabledTools` as a synonym of `tools`", () => {
    smitheryEntry({
      config: { enabledTools: ["a", "b"], debug: false },
    });

    const passed = initializeMcpServer.mock.calls[0][1];
    expect(passed.enabledTools).toEqual(["a", "b"]);
  });

  it("`tools` takes precedence over `enabledTools` when both are set", () => {
    smitheryEntry({
      config: { tools: "x", enabledTools: ["y"], debug: false },
    });

    const passed = initializeMcpServer.mock.calls[0][1];
    expect(passed.enabledTools).toEqual(["x"]);
  });

  it("trims whitespace and drops empty segments from a comma-separated string", () => {
    smitheryEntry({
      config: { tools: "  one ,, two  , ,three", debug: false },
    });

    const passed = initializeMcpServer.mock.calls[0][1];
    expect(passed.enabledTools).toEqual(["one", "two", "three"]);
  });

  it("leaves enabledTools undefined when no tool config is provided", () => {
    smitheryEntry({ config: { debug: false } });

    const passed = initializeMcpServer.mock.calls[0][1];
    expect(passed.enabledTools).toBeUndefined();
  });

  it("forwards exaApiKey, debug, and defaultSearchType verbatim", () => {
    smitheryEntry({
      config: {
        exaApiKey: "sk-test",
        debug: true,
        defaultSearchType: "fast",
      },
    });

    const passed = initializeMcpServer.mock.calls[0][1];
    expect(passed).toMatchObject({
      exaApiKey: "sk-test",
      debug: true,
      defaultSearchType: "fast",
    });
  });
});
