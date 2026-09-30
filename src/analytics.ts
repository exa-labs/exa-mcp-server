/**
 * Provider-neutral analytics passthrough. The package emits stable, named
 * checkpoint events from inside tool handlers and offers a one-time server
 * wrap hook, but ships no analytics backend of its own: embedders plug in
 * whatever provider they use (or nothing — every hook is optional and the
 * default is a no-op).
 */
export interface McpAnalytics {
  /**
   * Per-phase marker emitted from inside tool handlers, e.g.
   * `web_search_request_prepared`. Event names are part of the package's
   * semver contract so downstream dashboards keyed on them keep working.
   */
  checkpoint?: (event: string, attributes?: Record<string, unknown>) => void;
  /**
   * Called once per `initializeMcpServer` with the underlying MCP server
   * object (unwrapped from transport-handler wrappers when present), for
   * providers that instrument the server/transport directly. The return
   * value is ignored — instrument in place.
   */
  wrapServer?: (server: unknown) => unknown;
}
