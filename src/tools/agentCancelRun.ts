import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { checkpoint } from "agnost";
import type { AgentRun } from "../types.js";
import { retryAgentRequest } from "../utils/agentErrorHandler.js";
import { withAgentTool, type AgentToolConfig } from "../utils/agentTool.js";
import { jsonContent } from "../utils/response.js";

export function registerAgentCancelRunTool(server: McpServer, config?: AgentToolConfig): void {
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
    withAgentTool(
      "agent_cancel_run",
      config,
      ({ runId }) => runId,
      async ({ runId }, { client }) => {
        const run = await retryAgentRequest(() => client.agent.runs.cancel(runId)) as AgentRun;
        checkpoint("agent_cancel_run_response_received", { status: run.status });

        return jsonContent({
          success: true,
          id: run.id,
          status: run.status,
          nextAction: "Create a corrected run if the task still needs to be completed.",
          run,
        });
      },
    ),
  );
}
