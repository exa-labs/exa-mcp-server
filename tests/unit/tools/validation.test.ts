import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  lenientOptionalBoolean,
  lenientOptionalNumber,
  lenientOptionalPositiveNumber,
  lenientString,
} from "../../../src/tools/validation.js";
import { FakeMcpServer } from "../../helpers/fakeMcpServer.js";

vi.mock("agnost", () => ({ checkpoint: vi.fn() }));

describe("validation helpers", () => {
  describe("lenientString", () => {
    const schema = lenientString();

    it.each([
      ["plain string", "hello", "hello"],
      ["coerces number to string", 42, "42"],
      ["coerces boolean to string", true, "true"],
      ["trims surrounding whitespace", "  hi  ", "hi"],
    ])("%s", (_, input, expected) => {
      const parsed = schema.safeParse(input);
      expect(parsed.success).toBe(true);
      if (parsed.success) expect(parsed.data).toBe(expected);
    });

    it.each([
      ["empty string", ""],
      ["whitespace-only", "   "],
      ["null", null],
      ["undefined", undefined],
    ])("rejects %s", (_, input) => {
      expect(schema.safeParse(input).success).toBe(false);
    });
  });

  describe("lenientOptionalNumber", () => {
    const schema = lenientOptionalNumber();

    it.each([
      ["passthrough number", 10, 10],
      ["coerces numeric string", "10", 10],
      ["coerces float string", "3.14", 3.14],
      ["zero", 0, 0],
      ["negative", -5, -5],
    ])("accepts %s", (_, input, expected) => {
      const parsed = schema.safeParse(input);
      expect(parsed.success).toBe(true);
      if (parsed.success) expect(parsed.data).toBe(expected);
    });

    it.each([
      ["non-numeric string", "ten"],
      ["object", { foo: 1 }],
      ["array", [1, 2]],
    ])("falls back to undefined on %s", (_, input) => {
      const parsed = schema.safeParse(input);
      expect(parsed.success).toBe(true);
      if (parsed.success) expect(parsed.data).toBeUndefined();
    });

    it("undefined stays undefined", () => {
      const parsed = schema.safeParse(undefined);
      expect(parsed.success).toBe(true);
      if (parsed.success) expect(parsed.data).toBeUndefined();
    });
  });

  describe("lenientOptionalPositiveNumber", () => {
    const schema = lenientOptionalPositiveNumber();

    it("accepts positive number", () => {
      const parsed = schema.safeParse(5);
      expect(parsed.success).toBe(true);
      if (parsed.success) expect(parsed.data).toBe(5);
    });

    it.each([
      ["zero (silently drops to undefined)", 0],
      ["negative (silently drops to undefined)", -3],
      ["non-numeric string", "five"],
    ])("%s -> undefined", (_, input) => {
      const parsed = schema.safeParse(input);
      expect(parsed.success).toBe(true);
      if (parsed.success) expect(parsed.data).toBeUndefined();
    });
  });

  describe("lenientOptionalBoolean", () => {
    const schema = lenientOptionalBoolean();

    it.each([
      ["true", true, true],
      ["false", false, false],
      ['"true"', "true", true],
      ['"True" (case-insensitive)', "True", true],
      ['"TRUE"', "TRUE", true],
      ['"1"', "1", true],
      ['"yes"', "yes", true],
      ['"YES"', "YES", true],
      ['"false"', "false", false],
      ['"False"', "False", false],
      ['"0"', "0", false],
      ['"no"', "no", false],
    ])("coerces %s -> %s", (_, input, expected) => {
      const parsed = schema.safeParse(input);
      expect(parsed.success).toBe(true);
      if (parsed.success) expect(parsed.data).toBe(expected);
    });

    it.each([
      ["unrecognised string", "junk"],
      ["number", 42],
      ["object", { ok: true }],
    ])("falls back to undefined on %s", (_, input) => {
      const parsed = schema.safeParse(input);
      expect(parsed.success).toBe(true);
      if (parsed.success) expect(parsed.data).toBeUndefined();
    });

    it("undefined stays undefined", () => {
      const parsed = schema.safeParse(undefined);
      expect(parsed.success).toBe(true);
      if (parsed.success) expect(parsed.data).toBeUndefined();
    });
  });
});

describe("web_fetch_exa urls preprocess", () => {
  it("accepts arrays, JSON-encoded arrays, and bare URL strings", async () => {
    const { registerWebFetchTool } = await import("../../../src/tools/webFetch.js");
    const server = new FakeMcpServer();
    registerWebFetchTool(server as any, { exaApiKey: "test-key" });

    const inputSchema = server.getTool("web_fetch_exa").inputSchema as Record<string, z.ZodTypeAny>;
    const urls = inputSchema.urls;
    expect(urls).toBeDefined();

    const cases: Array<[string, unknown, string[] | "fail"]> = [
      ["passthrough array", ["https://a.com", "https://b.com"], ["https://a.com", "https://b.com"]],
      ["JSON-encoded array", '["https://a.com","https://b.com"]', ["https://a.com", "https://b.com"]],
      ["bare URL string", "https://example.com", ["https://example.com"]],
      ["object (not an array)", { foo: "bar" }, "fail"],
      ["JSON-encoded object", '{"foo":"bar"}', "fail"],
    ];

    for (const [name, input, expected] of cases) {
      const parsed = urls.safeParse(input);
      if (expected === "fail") {
        expect(parsed.success, `${name} should fail`).toBe(false);
      } else {
        expect(parsed.success, `${name} should succeed`).toBe(true);
        if (parsed.success) expect(parsed.data).toEqual(expected);
      }
    }
  });
});

describe("advertised JSON Schema retains usable type info", () => {
  it("each lenient helper produces a JSON Schema with a type field", () => {
    const fields = {
      query: lenientString(),
      numResults: lenientOptionalNumber(),
      maxCharacters: lenientOptionalPositiveNumber(),
      enableSummary: lenientOptionalBoolean(),
    };
    const json = zodToJsonSchema(z.object(fields)) as {
      properties?: Record<string, { type?: string | string[] }>;
    };
    const props = json.properties ?? {};

    // We don't pin exact JSON Schema shapes (zod-to-json-schema's representation
    // of preprocess/catch evolves across versions); we just guard against the
    // regression where lenient wrappers strip type info entirely, leaving LLMs
    // with no hint about what each field expects.
    expect(props.query?.type).toBeDefined();
    expect(props.numResults?.type).toBeDefined();
    expect(props.maxCharacters?.type).toBeDefined();
    expect(props.enableSummary?.type).toBeDefined();
  });

  it("each registered tool advertises non-empty inputSchema fields", async () => {
    const { registerWebSearchTool } = await import("../../../src/tools/webSearch.js");
    const { registerWebFetchTool } = await import("../../../src/tools/webFetch.js");

    const server = new FakeMcpServer();
    registerWebSearchTool(server as any);
    registerWebFetchTool(server as any);

    for (const toolName of ["web_search_exa", "web_fetch_exa"]) {
      const inputSchema = server.getTool(toolName).inputSchema as Record<string, z.ZodTypeAny>;
      expect(Object.keys(inputSchema).length, `${toolName} should expose fields`).toBeGreaterThan(0);

      const json = zodToJsonSchema(z.object(inputSchema)) as {
        properties?: Record<string, { type?: string | string[]; description?: string }>;
      };
      const props = json.properties ?? {};
      for (const [fieldName, fieldSchema] of Object.entries(props)) {
        expect(fieldSchema.type, `${toolName}.${fieldName} should have a JSON Schema type`).toBeDefined();
      }
    }
  });
});
