import type { ToolContent } from "../types.js";

export function jsonContent(value: unknown): ToolContent {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}

/**
 * Result for a tool that declares an MCP `outputSchema`: the object goes out as
 * `structuredContent` and, per the spec's back-compat guidance, as a serialized
 * JSON text block. The text block is compact (no indentation) since clients
 * forward exactly one of the two channels to the model and the text is the
 * fallback for those that ignore `structuredContent`.
 */
export function structuredContent(value: Record<string, unknown>): ToolContent {
  return {
    content: [{ type: "text", text: JSON.stringify(value) }],
    structuredContent: value,
  };
}

export function clampInteger(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (value == null || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}
