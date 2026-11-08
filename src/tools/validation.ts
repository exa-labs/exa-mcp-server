import { z } from "zod";

/**
 * Lenient string schema: coerces accidental number/boolean inputs to strings,
 * then validates as a non-empty trimmed string.
 */
export function lenientString() {
  return z.preprocess(
    (v) => (typeof v === "number" || typeof v === "boolean" ? String(v) : v),
    z.string().trim().min(1),
  );
}

/**
 * null and "" are unset. z.coerce.number() maps both to 0, so a client that
 * leaves an optional number empty would otherwise send that 0 (for example
 * maxAgeHours: 0, which forces a live crawl).
 */
function unsetBlankNumber(value: unknown): unknown {
  if (value === null || value === "") return undefined;
  return value;
}

/**
 * Lenient optional number: uses z.coerce for string-to-number conversion,
 * falls back to undefined on invalid input instead of throwing a validation error.
 * null and "" stay unset instead of becoming 0.
 */
export function lenientOptionalNumber() {
  return z.preprocess(unsetBlankNumber, z.coerce.number().optional()).catch(undefined);
}

/**
 * Lenient optional positive number: same as lenientOptionalNumber but requires min(1).
 */
export function lenientOptionalPositiveNumber() {
  return z.preprocess(unsetBlankNumber, z.coerce.number().min(1).optional()).catch(undefined);
}

/**
 * Lenient optional boolean: coerces common string representations
 * ("true", "True", "1", "yes", "false", "False", "0", "no") to booleans,
 * falls back to undefined on unrecognised input.
 */
export function lenientOptionalBoolean() {
  return z
    .preprocess((v) => {
      if (typeof v === "string") {
        const lower = v.toLowerCase();
        if (["true", "1", "yes"].includes(lower)) return true;
        if (["false", "0", "no"].includes(lower)) return false;
      }
      return v;
    }, z.boolean().optional())
    .catch(undefined);
}
