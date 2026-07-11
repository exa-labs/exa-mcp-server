import type { ToolContent } from "../types.js";

export function jsonContent(value: unknown): ToolContent {
  return {
    content: [{
      type: "text",
      text: JSON.stringify(value, null, 2),
    }],
  };
}

export function clampInteger(value: number | undefined, fallback: number, min: number, max: number): number {
  if (value == null || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}
