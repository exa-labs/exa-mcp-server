import type { Exa } from "exa-js";
import type { ToolContent } from "../types.js";
import { createExaClient } from "../tools/config.js";
import { formatAgentToolError } from "./agentErrorHandler.js";
import { createRequestLogger } from "./logger.js";

export type AgentToolConfig = {
  exaApiKey?: string;
  oauthAccessToken?: string;
  exaSource?: string;
  mcpSessionId?: string;
  mcpClient?: unknown;
};

type AgentToolContext = {
  client: Exa;
  logger: ReturnType<typeof createRequestLogger>;
};

export function withAgentTool<TArgs>(
  toolName: string,
  config: AgentToolConfig | undefined,
  startMessage: (args: TArgs) => string,
  run: (args: TArgs, context: AgentToolContext) => Promise<ToolContent>,
): (args: TArgs) => Promise<ToolContent> {
  return async (args: TArgs) => {
    const logger = createRequestLogger(toolName);
    logger.start(startMessage(args));

    try {
      const hasApiKey = typeof config?.exaApiKey === "string" && config.exaApiKey.length > 0;
      const hasOAuthToken = typeof config?.oauthAccessToken === "string" && config.oauthAccessToken.length > 0;
      if (!hasApiKey && !hasOAuthToken) {
        throw new Error("Agent tools require user authentication. Provide an Exa API key or OAuth access token.");
      }

      const client = createExaClient(config, "agent-mcp");
      const result = await run(args, { client, logger });
      logger.complete();
      return result;
    } catch (error) {
      logger.error(error);
      return formatAgentToolError(error, toolName);
    }
  };
}
