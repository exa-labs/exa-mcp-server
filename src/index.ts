/**
 * Public library entry point for exa-mcp-server.
 *
 * Embed the full tool surface on any MCP server object with
 * `initializeMcpServer(server, config)`, or register individual tools with the
 * exported `register*Tool` functions. The registered tool names, input schemas,
 * and descriptions are the package's semver contract (see
 * tests/unit/contract.test.ts); breaking changes to them ship as major versions.
 */

export { initializeMcpServer, type McpConfig } from "./mcp-handler.js";
export type { McpAnalytics } from "./analytics.js";
export { buildConfigFromEnv, main as runStdioServer } from "./stdio.js";

export {
  TOOL_REGISTRY,
  AVAILABLE_TOOL_IDS,
  AGENT_TOOL_IDS,
  TOOL_SELECTION_ALIASES,
  AVAILABLE_TOOL_SELECTION_VALUES,
  expandToolSelection,
  isToolEnabledByDefault,
  requiresUserProvidedApiKey,
  isAgentTool,
  listToolMetadata,
  type ToolId,
  type ToolGroup,
  type ToolMetadata,
  type ToolSelectionValue,
} from "./toolRegistry.js";

export { registerWebSearchTool } from "./tools/webSearch.js";
export { registerWebSearchAdvancedTool } from "./tools/webSearchAdvanced.js";
export { registerWebFetchTool } from "./tools/webFetch.js";
export {
  registerAgentRunTool,
  resolveAgentCallWindowMs,
  parsePositiveInteger,
  DEFAULT_MCP_MAX_DURATION_SECONDS,
  type AgentRunConfig,
  type AgentRunToolOptions,
} from "./tools/agentRun.js";
