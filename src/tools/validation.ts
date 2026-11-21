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
 * `undefined` for a value a client sends to mean "not set": `null`, or a
 * string that is empty or only whitespace. Any other value is returned as is.
 * Applied before number coercion, which would otherwise read these as 0.
 */
function unsetAsUndefined(value: unknown): unknown {
  if (value === null) return undefined;
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
}

/**
 * Lenient optional number: treats `null` and blank strings as unset, uses
 * z.coerce for string-to-number conversion, and falls back to undefined on
 * invalid input instead of throwing a validation error.
 */
export function lenientOptionalNumber() {
  return z.preprocess(unsetAsUndefined, z.coerce.number().optional()).catch(undefined);
}

/**
 * Lenient optional positive number: same as lenientOptionalNumber but requires min(1).
 */
export function lenientOptionalPositiveNumber() {
  return z.preprocess(unsetAsUndefined, z.coerce.number().min(1).optional()).catch(undefined);
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

/**
 * Lenient string array: accepts an array, a JSON-encoded array string, or a single
 * string, since some clients send array arguments as strings.
 */
export function lenientStringArray() {
  return z.preprocess((val) => {
    if (typeof val === "string") {
      try {
        return JSON.parse(val);
      } catch {
        return [val];
      }
    }
    return val;
  }, z.array(z.string()));
}
