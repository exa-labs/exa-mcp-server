/** Parse the explicit response media types required by MCP Streamable HTTP. */
const TOKEN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
const QUOTED_VALUE = /^"(?:[\t !#-\[\]-~\x80-\xff]|\\[\t !-~\x80-\xff])*"$/;

/** Split an HTTP list without treating delimiters inside quoted strings as separators. */
function splitHeader(value: string, separator: string): string[] | undefined {
  const parts: string[] = [];
  let start = 0;
  let quoted = false;
  let escaped = false;
  for (let index = 0; index < value.length; index++) {
    const character = value[index];
    if (escaped) {
      escaped = false;
    } else if (quoted && character === "\\") {
      escaped = true;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (!quoted && character === separator) {
      parts.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  if (quoted || escaped) return undefined;
  parts.push(value.slice(start).trim());
  return parts;
}

/** The media type and quality of one media range, or undefined when the range is malformed. */
function parseMediaRange(range: string): { mediaType: string; quality: number } | undefined {
  const parts = splitHeader(range, ";");
  if (!parts) return undefined;
  const [mediaType, ...parameters] = parts;
  const components = mediaType.split("/");
  if (components.length !== 2 || !components.every((part) => TOKEN.test(part))) return undefined;
  let quality = 1;
  let hasQuality = false;
  for (const parameter of parameters) {
    // RFC 9110 allows empty parameters (`type/subtype;`).
    if (!parameter) continue;
    const equals = parameter.indexOf("=");
    if (equals < 1) return undefined;
    const name = parameter.slice(0, equals).trim();
    const parameterValue = parameter.slice(equals + 1).trim();
    if (!TOKEN.test(name) || (!TOKEN.test(parameterValue) && !QUOTED_VALUE.test(parameterValue))) {
      return undefined;
    }
    if (name.toLowerCase() === "q") {
      if (hasQuality || !/^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/.test(parameterValue)) {
        return undefined;
      }
      quality = Number(parameterValue);
      hasQuality = true;
    }
  }
  return { mediaType: mediaType.toLowerCase(), quality };
}

/**
 * Require both concrete MCP response types, each in a well-formed media range
 * with nonzero quality. Other malformed ranges in the list are ignored rather
 * than failing the whole header.
 */
export function acceptsMcpResponses(value: string | null): boolean {
  if (!value || /[\x00-\x08\x0a-\x1f\x7f]/.test(value)) return false;
  const ranges = splitHeader(value, ",");
  if (!ranges) return false;
  const accepted = new Set<string>();
  for (const range of ranges) {
    if (!range) continue;
    const parsed = parseMediaRange(range);
    if (parsed && parsed.quality > 0) accepted.add(parsed.mediaType);
  }
  return accepted.has("application/json") && accepted.has("text/event-stream");
}
