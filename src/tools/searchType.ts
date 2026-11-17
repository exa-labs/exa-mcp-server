export const SEARCH_TYPES = ["auto", "lite", "fast", "instant"] as const;

export type SearchType = (typeof SEARCH_TYPES)[number];

export function parseSearchType(value: string | null | undefined): SearchType | undefined {
  return SEARCH_TYPES.find((type) => type === value);
}
