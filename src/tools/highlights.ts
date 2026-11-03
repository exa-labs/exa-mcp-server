/**
 * Dynamic Highlights (beta), a server-level setting: a connector turns it on
 * with `?dynamicHighlights=true` on the MCP URL, and the web search tools then
 * ask for highlights chosen across all results under one shared budget
 * instead of a fixed budget per URL. It is the connector owner's choice, not a
 * tool parameter, so an agent never has to opt in per call. The API serves it
 * behind the `Exa-Beta` token below while the feature is in beta.
 */

/** `Exa-Beta` token the API requires on a request that sets `highlights.dynamic`. */
export const DYNAMIC_HIGHLIGHTS_BETA_TOKEN = "dynamic-highlights-2026-08-28";

/**
 * The dynamic highlights setting `value` names: true for "true", false for
 * "false", undefined for anything else (absent, empty or misspelled), so a
 * caller can fall back to another source.
 */
export function parseDynamicHighlights(value: string | null | undefined): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

/**
 * Adds `token` to the `Exa-Beta` header in `headers`, keeping tokens it
 * already carries: the API reads the header as a comma-separated list.
 */
export function addExaBeta(headers: Record<string, string>, token: string): void {
  const existing = headers["Exa-Beta"];
  headers["Exa-Beta"] = existing ? `${existing}, ${token}` : token;
}
