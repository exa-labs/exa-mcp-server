import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { checkpoint } from "agnost";
import { AgentApiClient, type AgentApiClientConfig } from "../utils/agentApiClient.js";
import { formatAgentToolError } from "../utils/agentErrorHandler.js";
import { createRequestLogger } from "../utils/logger.js";
import { jsonContent } from "../utils/response.js";

export function registerAgentCancelRunTool(server: McpServer, config?: AgentApiClientConfig): void {
  server.tool(
    "agent_cancel_run",
    "Cancel a queued or running Exa Agent run. Use only when the user asks, the run is clearly wrong, or a duplicate run was accidentally created.",
    {
      runId: z.string().min(1).describe("The agent_run_... ID to cancel."),
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
    },
    async ({ runId }) => {
      const logger = createRequestLogger("agent_cancel_run");
      logger.start(runId);

      try {
        const run = await new AgentApiClient(config).cancelRun(runId);
        checkpoint("agent_cancel_run_response_received", { status: run.status });
        logger.complete();

        return jsonContent({
          success: true,
          id: run.id,
          status: run.status,
          nextAction: "Create a corrected run if the task still needs to be completed.",
          run,
        });
      } catch (error) {
        logger.error(error);
        return formatAgentToolError(error, "agent_cancel_run");
      }
    },
  );
}
