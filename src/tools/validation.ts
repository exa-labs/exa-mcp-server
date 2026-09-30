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
 * ZodOptional whose `isOptional()` probe always reports false.
 *
 * zod-to-json-schema (what the MCP SDK uses to advertise tool schemas) puts a
 * property in the JSON-schema `required` list iff `isOptional()` is false,
 * and `isOptional()` is implemented as "does `undefined` parse?". This
 * subclass decouples the two so a field can be advertised as required while
 * still parsing a missing value.
 */
class AdvertisedRequiredOptional<T extends z.ZodTypeAny> extends z.ZodOptional<T> {
  isOptional(): boolean {
    return false;
  }
}

/**
 * Advertise `inner` as a required parameter in the tool's JSON schema while
 * accepting a missing value at call time; any value that is present is parsed
 * by `inner`. Models see the field as required; programmatic callers that omit
 * it keep working.
 */
export function advertisedRequired<T extends z.ZodTypeAny>(
  inner: T,
): AdvertisedRequiredOptional<T> {
  return new AdvertisedRequiredOptional({
    innerType: inner,
    typeName: z.ZodFirstPartyTypeKind.ZodOptional,
  });
}

/**
 * Lenient optional number: uses z.coerce for string-to-number conversion,
 * falls back to undefined on invalid input instead of throwing a validation error.
 */
export function lenientOptionalNumber() {
  return z.coerce.number().optional().catch(undefined);
}

/**
 * Lenient optional positive number: same as lenientOptionalNumber but requires min(1).
 */
export function lenientOptionalPositiveNumber() {
  return z.coerce.number().min(1).optional().catch(undefined);
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
