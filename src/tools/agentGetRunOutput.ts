import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { checkpoint } from "agnost";
import { AgentApiClient, type AgentApiClientConfig } from "../utils/agentApiClient.js";
import { formatAgentToolError } from "../utils/agentErrorHandler.js";
import { createRequestLogger } from "../utils/logger.js";
import { jsonContent } from "../utils/response.js";
import { isTerminalStatus } from "./runStatus.js";

type AgentToolConfig = AgentApiClientConfig & {
  userProvidedApiKey?: boolean;
};

export function registerAgentGetRunOutputTool(server: McpServer, config?: AgentToolConfig): void {
  server.tool(
    "agent_get_run_output",
    "Retrieve completed Exa Agent output in a Claude-friendly shape: text, structured JSON, grounding, usage, and cost. Use after agent_wait_for_run reports completed.",
    {
      runId: z.string().min(1).describe("The completed agent_run_... ID."),
      requireCompleted: z.boolean().optional().describe("If true, return a status response until the run is completed. Default true."),
      includeText: z.boolean().optional().describe("Include output.text. Default true."),
      includeStructured: z.boolean().optional().describe("Include output.structured. Default true."),
      includeGrounding: z.boolean().optional().describe("Include output.grounding citations. Default true."),
      includeUsage: z.boolean().optional().describe("Include usage and costDollars. Default true."),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    },
    async ({ runId, requireCompleted, includeText, includeStructured, includeGrounding, includeUsage }) => {
      const requestId = `agent_get_run_output-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const logger = createRequestLogger(requestId, "agent_get_run_output");
      logger.start(runId);

      try {
        const run = await new AgentApiClient(config).getRun(runId);
        checkpoint("agent_get_run_output_response_received", { status: run.status });
        logger.complete();

        const mustBeCompleted = requireCompleted ?? true;
        if (mustBeCompleted && run.status !== "completed") {
          return jsonContent({
            success: true,
            id: run.id,
            status: run.status,
            terminal: isTerminalStatus(run.status),
            outputReady: false,
            nextAction: isTerminalStatus(run.status)
              ? "This run ended without completed output. Create a corrected run if the task still needs to be completed."
              : `Run is still ${run.status}. Call agent_wait_for_run with runId "${runId}".`,
          });
        }

        const output: Record<string, unknown> = {};
        if (includeText ?? true) output.text = run.output.text;
        if (includeStructured ?? true) output.structured = run.output.structured;
        if (includeGrounding ?? true) output.grounding = run.output.grounding;

        return jsonContent({
          success: true,
          id: run.id,
          status: run.status,
          outputReady: run.status === "completed",
          output,
          ...(includeUsage ?? true ? { usage: run.usage, costDollars: run.costDollars } : {}),
          nextAction: "Validate coverage, deduplicate structured rows, inspect grounding, and continue with previousRunId if gaps remain.",
        });
      } catch (error) {
        logger.error(error);
        return formatAgentToolError(error, "agent_get_run_output", config?.userProvidedApiKey);
      }
    },
  );
}
