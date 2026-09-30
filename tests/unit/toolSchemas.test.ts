/**
 * Tool definitions as clients see them on `tools/list`.
 *
 * JSON Schema defines `pattern` as an ECMA-262 regex, and strict model
 * providers compile it in unicode mode, where an escape of a non-syntax
 * character (`\_`) is an error. One such pattern makes the provider reject
 * every request that carries the tool list, so every advertised pattern must
 * compile with the `u` flag.
 */
import { beforeAll, describe, expect, it } from "vitest";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { initializeMcpServer } from "../../src/mcp-handler.js";
import { AVAILABLE_TOOL_IDS } from "../../src/toolRegistry.js";
import { collectPatterns, listAdvertisedTools } from "../helpers/advertisedTools.js";

/** The compile error of `pattern` as a unicode-mode ECMA-262 regex, or null when it compiles. */
function unicodeRegexError(pattern: string): string | null {
  try {
    new RegExp(pattern, "u");
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

let tools: Tool[];

beforeAll(async () => {
  tools = await listAdvertisedTools((server) =>
    initializeMcpServer(server, {
      exaApiKey: "test-key",
      userProvidedApiKey: true,
      enabledTools: [...AVAILABLE_TOOL_IDS],
    }),
  );
});

function advertised(name: string): Tool {
  const tool = tools.find((candidate) => candidate.name === name);
  if (!tool) throw new Error(`${name} is not advertised`);
  return tool;
}

describe("tools/list", () => {
  it("advertises every available tool", () => {
    expect(tools.map((tool) => tool.name).sort()).toEqual([...AVAILABLE_TOOL_IDS].sort());
  });

  it("carries only patterns that compile as unicode-mode regexes", () => {
    const invalid = tools.flatMap((tool) =>
      [
        ...collectPatterns(tool.inputSchema, `${tool.name}.inputSchema`),
        ...collectPatterns(tool.outputSchema, `${tool.name}.outputSchema`),
      ].flatMap(([path, pattern]) => {
        const error = unicodeRegexError(pattern);
        return error === null ? [] : [`${path} ${JSON.stringify(pattern)}: ${error}`];
      }),
    );
    expect(invalid).toEqual([]);
  });

  it("constrains agent_run IDs to the agent_run_ prefix", () => {
    expect(collectPatterns(advertised("agent_run").inputSchema)).toEqual([
      ["$.properties.runId.pattern", "^agent_run_"],
      ["$.properties.previousRunId.pattern", "^agent_run_"],
    ]);
  });

  it("marks every tool read-only and open-world", () => {
    for (const tool of tools) {
      expect(tool.annotations, tool.name).toMatchObject({
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: true,
      });
    }
  });

  it("advertises web_search_exa's objective as an optional bounded string", () => {
    const inputSchema = advertised("web_search_exa").inputSchema as {
      required?: string[];
      properties: Record<string, unknown>;
    };
    expect(inputSchema.required).toEqual(["query"]);
    expect(inputSchema.properties.objective).toEqual({
      type: "string",
      minLength: 1,
      maxLength: 4096,
      description:
        "Goal for this search turn; say which documents should rank first, which should be excluded, and what specific facts or figures to pull from them.",
    });
  });

  it("declares an output schema for agent_run only", () => {
    expect(tools.filter((tool) => tool.outputSchema).map((tool) => tool.name)).toEqual([
      "agent_run",
    ]);
    expect(advertised("agent_run").outputSchema).toMatchObject({
      type: "object",
      required: expect.arrayContaining(["success", "id", "status", "outputReady"]),
    });
  });
});
