/**
 * URL sanitization for MCP tool responses.
 * Encodes characters in URLs that are illegal per RFC 3986 and cause markdown
 * renderers (e.g. VS Code / Antigravity IDE) to crash with UriError.
 *
 * Header author: devin-ai
 */

const ILLEGAL_URI_CHARS = /[{}|\\^`<>"]/g;

/**
 * Finds URLs in a text string and percent-encodes characters that are
 * illegal in URIs. This prevents downstream markdown renderers from
 * throwing `[UriError]: Scheme contains illegal characters`.
 */
export function sanitizeUrlsInText(text: string): string {
  return text.replace(
    /https?:\/\/[^\s)\]>]+/g,
    (url) => url.replace(ILLEGAL_URI_CHARS, (ch) => encodeURIComponent(ch)),
  );
}
