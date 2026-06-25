import type { ToolContent } from "../types.js";
import { formatAgentToolError } from "./agentErrorHandler.js";
import { AgentApiClient, type AgentApiClientConfig } from "./agentApiClient.js";
import { createRequestLogger } from "./logger.js";

type AgentToolContext = {
  client: AgentApiClient;
  logger: ReturnType<typeof createRequestLogger>;
};

export function withAgentTool<TArgs>(
  toolName: string,
  config: AgentApiClientConfig | undefined,
  startMessage: (args: TArgs) => string,
  run: (args: TArgs, context: AgentToolContext) => Promise<ToolContent>,
): (args: TArgs) => Promise<ToolContent> {
  return async (args: TArgs) => {
    const requestId = `${toolName}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const logger = createRequestLogger(requestId, toolName);
    logger.start(startMessage(args));

    try {
      const client = new AgentApiClient(config);
      const result = await run(args, { client, logger });
      logger.complete();
      return result;
    } catch (error) {
      logger.error(error);
      return formatAgentToolError(error, toolName);
    }
  };
}
