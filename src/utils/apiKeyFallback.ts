/**
 * Retry a tool call on the request's fallback credential when upstream rejects
 * its API key.
 *
 * An HTTP entrypoint can see two credentials on one request: an API key (a
 * connector's `?exaApiKey=`) and the Bearer JWT an OAuth-discovering client
 * attaches alongside it. The key wins (api/mcp.ts). When the Exa API rejects
 * that key, the JWT may still be the user's working credential: `fallback`
 * (built per request and passed as `McpConfig.apiKeyFallback`) verifies it and
 * switches the request config over, and the call runs once more on it. Any
 * other failure returns as-is.
 */

export type ToolHandler = (...args: unknown[]) => Promise<unknown>;

/** An MCP server (McpServer or mcp-handler's) as far as tool registration goes. */
export interface ToolRegistrar {
  tool: (...args: never[]) => unknown;
  registerTool?: (...args: never[]) => unknown;
}

const TOOL_REGISTRATION_METHODS = new Set<string | symbol>(["tool", "registerTool"]);

/**
 * Wrap an MCP server so every `server.tool(name, ..., handler)` and
 * `server.registerTool(name, config, handler)` registration passes its handler
 * (the trailing function argument) through `wrap`. All other properties pass
 * through.
 */
export function wrapToolRegistrations<T extends ToolRegistrar>(
  server: T,
  wrap: (tool: string, handler: ToolHandler) => ToolHandler,
): T {
  return new Proxy(server, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (!TOOL_REGISTRATION_METHODS.has(prop) || typeof value !== "function") {
        return typeof value === "function" ? value.bind(target) : value;
      }
      return (...args: unknown[]) => {
        const name = args[0];
        const last = args[args.length - 1];
        if (typeof name === "string" && typeof last === "function") {
          args[args.length - 1] = wrap(name, last as ToolHandler);
        }
        return (value as (...a: unknown[]) => unknown).apply(target, args);
      };
    },
  });
}

/** Whether a tool result is an MCP tool error (`isError: true`). */
function isToolError(result: unknown): boolean {
  return (
    typeof result === "object" &&
    result !== null &&
    (result as { isError?: unknown }).isError === true
  );
}

/** The text of a tool result's first content block, or "" when it has none. */
function firstText(result: unknown): string {
  const content = (result as { content?: unknown }).content;
  const first = Array.isArray(content) ? (content[0] as { text?: unknown } | undefined) : undefined;
  return typeof first?.text === "string" ? first.text : "";
}

function numericStatus(value: unknown): number | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const candidate = value as {
    status?: unknown;
    statusCode?: unknown;
    code?: unknown;
    response?: { status?: unknown };
  };
  for (const status of [
    candidate.status,
    candidate.statusCode,
    candidate.code,
    candidate.response?.status,
  ]) {
    if (typeof status === "number") return status;
  }
  return undefined;
}

/**
 * The status formatToolError and formatAgentToolError put at the start of a
 * rejected call's error text: "<tool> error (<status>): <API message>".
 */
const TOOL_ERROR_STATUS = /^\S+ error \((\d{3})\):/;

/** Whether a tool outcome (returned result or thrown error) is an upstream API-key rejection. */
export function isInvalidApiKeyOutcome(errorOrResult: unknown): boolean {
  if (isToolError(errorOrResult)) {
    // A result with structuredContent reports an Agent run's own outcome (a
    // failed run), and the run was created, so this call's key worked. Only
    // the leading status of an error text says the API rejected this call;
    // a status or "unauthorized" further in is detail from elsewhere (a
    // failed run's error, a fetched page's URL).
    if ((errorOrResult as { structuredContent?: unknown }).structuredContent !== undefined) {
      return false;
    }
    const status = firstText(errorOrResult).match(TOOL_ERROR_STATUS)?.[1];
    return status === "401" || status === "403";
  }

  if (!(errorOrResult instanceof Error)) return false;
  const code = (errorOrResult as { code?: unknown }).code;
  const codeText = typeof code === "string" ? code : "";
  if (
    errorOrResult.name === "AbortError" ||
    /abort|timed?\s*out|timeout/i.test(errorOrResult.message) ||
    /timeout|aborted/i.test(codeText)
  ) {
    return false;
  }
  if (
    /invalid[_\s-]*(input|argument)|validation|zod/i.test(`${codeText} ${errorOrResult.message}`)
  ) {
    return false;
  }
  const status = numericStatus(errorOrResult);
  return status === 401 || status === 403;
}

/**
 * Wrap `handler` so an invalid-API-key outcome triggers `fallback()` and, if
 * that switched credentials, a single retry with the same arguments.
 */
export function withApiKeyFallbackHandler(
  handler: ToolHandler,
  fallback: () => Promise<boolean>,
): ToolHandler {
  return async (...args: unknown[]): Promise<unknown> => {
    let outcome: unknown;
    try {
      outcome = await handler(...args);
    } catch (error) {
      if (isInvalidApiKeyOutcome(error) && (await fallback())) {
        return handler(...args);
      }
      throw error;
    }
    if (isInvalidApiKeyOutcome(outcome) && (await fallback())) {
      return handler(...args);
    }
    return outcome;
  };
}

/** Apply `withApiKeyFallbackHandler` to every tool registered on `server`. */
export function withApiKeyFallback<T extends ToolRegistrar>(
  server: T,
  fallback: () => Promise<boolean>,
): T {
  return wrapToolRegistrations(server, (_tool, handler) =>
    withApiKeyFallbackHandler(handler, fallback),
  );
}
