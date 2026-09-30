/**
 * Parsing of the raw HTTP request target (`IncomingMessage.url`).
 *
 * The request target and the Host header are both fully client-controlled and
 * are not guaranteed to form a valid URL, so parsing them is a validation step
 * that reports failure rather than an operation that always succeeds.
 */

/**
 * Parse a request target against its Host header into an absolute URL.
 *
 * Returns null when the pair cannot form a URL — most notably a target of
 * `//`, which WHATWG parsing reads as a protocol-relative URL with an empty
 * host and rejects, and a Host header that is not a valid authority.
 */
export function parseRequestTarget(
  rawTarget: string | undefined,
  hostHeader: string | undefined,
): URL | null {
  try {
    return new URL(rawTarget ?? "/", `http://${hostHeader ?? "localhost"}`);
  } catch {
    return null;
  }
}
