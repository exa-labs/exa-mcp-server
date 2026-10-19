/**
 * `warnings` and `notices` on Exa search responses, for the tools that show
 * search results to a model.
 *
 * - `warnings` describe the request: a field the API ignores, deprecates or
 *   does not support. They are for whoever maintains the code that builds the
 *   request, so a tool logs them and never shows them to the model.
 * - `notices` describe how the results were produced, such as a query
 *   restriction relaxed to return any results, and are written for a model. A
 *   tool shows every notice's `message`, in the format agent evals measured:
 *   a text result leads with one `Note: <message>` line per notice and a blank
 *   line; a JSON result gains a `notices` array of the messages, placed just
 *   before `results`.
 *
 * A result without notices is exactly what it was before notices existed.
 */
import type { ExaSearchNotice } from "../types.js";
import { sanitizeSearchWarnings } from "../utils/exaResponseSanitizer.js";

type TextBlock = { type: "text"; text: string };

type TextToolResult = { content: TextBlock[] };

type StructuredToolResult<R> = R & { structuredContent?: Record<string, unknown> };

/**
 * Whether a result with notices also carries `structuredContent`: the results
 * the text shows plus the full notice objects, `details` included. Off, no
 * search result carries `structuredContent`, so every client shows the model
 * the same text (some clients show a result's `structuredContent` instead of
 * its text when it has both).
 */
export const structuredNotices = { enabled: false };

/** Logs each warning a search response carries; warnings never reach the model. */
export function logSearchWarnings(
  response: { warnings?: unknown } | null | undefined,
  logger: { log: (message: string) => void },
): void {
  for (const warning of sanitizeSearchWarnings(response?.warnings) ?? []) {
    logger.log(`Exa API warning ${warning.code} at ${warning.path}: ${warning.message}`);
  }
}

/** The notice messages as the lines that lead a text result, one `Note:` line each. */
export function formatSearchNotices(notices: readonly ExaSearchNotice[]): string {
  return notices.map((notice) => `Note: ${notice.message}`).join("\n");
}

/**
 * `payload` with `notices` set to `value`, placed just before `results` (last
 * when the payload has no `results`).
 */
function withNoticesBeforeResults(
  payload: Record<string, unknown>,
  value: unknown,
): Record<string, unknown> {
  const entries = Object.entries(payload).filter(([key]) => key !== "notices");
  const at = entries.findIndex(([key]) => key === "results");
  entries.splice(at === -1 ? entries.length : at, 0, ["notices", value]);
  return Object.fromEntries(entries);
}

/**
 * The JSON payload a tool serializes as its result text: `payload` with a
 * `notices` array of the notice messages just before `results`, or `payload`
 * itself when there are no notices.
 */
export function withNoticeMessages(
  payload: Record<string, unknown>,
  notices: readonly ExaSearchNotice[] | undefined,
): Record<string, unknown> {
  if (notices === undefined || notices.length === 0) {
    return payload;
  }

  return withNoticesBeforeResults(
    payload,
    notices.map((notice) => notice.message),
  );
}

/**
 * Shows notices on a result whose text renders search results: one `Note:`
 * line per notice, then a blank line, then the text of its first block. With
 * `structuredNotices` on, `structuredContent` holds `rendered` (the data the
 * text shows) and the full notices. Returns the result unchanged when there are
 * no notices.
 */
export function withSearchNotices<R extends TextToolResult>(
  result: R,
  notices: readonly ExaSearchNotice[] | undefined,
  rendered: Record<string, unknown>,
): StructuredToolResult<R> {
  if (notices === undefined || notices.length === 0) {
    return result;
  }

  const lead = formatSearchNotices(notices);
  const [first, ...rest] = result.content;
  const content =
    first === undefined
      ? [{ type: "text" as const, text: lead }]
      : [{ ...first, text: `${lead}\n\n${first.text}` }, ...rest];

  return {
    ...result,
    content,
    ...(structuredNotices.enabled && { structuredContent: { ...rendered, notices } }),
  };
}

/**
 * Completes a result whose text is `withNoticeMessages(payload, notices)` as
 * JSON: with `structuredNotices` on and notices present, `structuredContent` is
 * `payload` with the full notices just before `results`. Returns the result
 * unchanged otherwise.
 */
export function withStructuredSearchNotices<R extends TextToolResult>(
  result: R,
  payload: Record<string, unknown>,
  notices: readonly ExaSearchNotice[] | undefined,
): StructuredToolResult<R> {
  if (!structuredNotices.enabled || notices === undefined || notices.length === 0) {
    return result;
  }

  return { ...result, structuredContent: withNoticesBeforeResults(payload, notices) };
}
