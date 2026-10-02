import { describe, expect, it } from "vitest";
import { parseRequestTarget } from "../../../src/utils/requestTarget.js";

describe("parseRequestTarget", () => {
  it("resolves a target against the Host header", () => {
    const url = parseRequestTarget("/mcp?x=1", "mcp.exa.ai");
    expect(url?.host).toBe("mcp.exa.ai");
    expect(url?.pathname).toBe("/mcp");
    expect(url?.search).toBe("?x=1");
  });

  it("defaults a missing target and Host header", () => {
    expect(parseRequestTarget(undefined, undefined)?.href).toBe("http://localhost/");
  });

  it("returns null for a protocol-relative target with an empty host", () => {
    expect(parseRequestTarget("//", "mcp.exa.ai")).toBeNull();
  });

  it("returns null for an unparseable Host header", () => {
    expect(parseRequestTarget("/mcp", "not a host")).toBeNull();
  });

  it("keeps a protocol-relative target that carries a host", () => {
    expect(parseRequestTarget("//example.com/mcp", "mcp.exa.ai")?.host).toBe("example.com");
  });
});
