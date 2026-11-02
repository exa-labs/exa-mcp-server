/**
 * The search types the search tools send to the Exa API, shared by every
 * place that accepts one: the `type` parameter of `web_search_advanced_exa`
 * and a server's configured default for `web_search_exa`
 * (`?defaultSearchType=` on HTTP, `DEFAULT_SEARCH_TYPE` on stdio).
 *
 * `fast` and `instant` are legacy but stay accepted and are forwarded as
 * given, never rewritten to `lite`: `lite` serves fewer parameters and only
 * cached content, so swapping it in would change what a caller gets.
 */

export const SEARCH_TYPES = ["auto", "lite", "fast", "instant"] as const;

export type SearchType = (typeof SEARCH_TYPES)[number];

/** `value` as a search type, or undefined when it names none (exact, case-sensitive match). */
export function parseSearchType(value: string | null | undefined): SearchType | undefined {
  return SEARCH_TYPES.find((type) => type === value);
}
