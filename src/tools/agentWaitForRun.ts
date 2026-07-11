import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { checkpoint } from "agnost";
import { API_CONFIG } from "./config.js";
import type { AgentRun } from "../types.js";
import { delay, retryAgentRequest } from "../utils/agentErrorHandler.js";
import { withAgentTool, type AgentToolConfig } from "../utils/agentTool.js";
import { clampInteger, jsonContent } from "../utils/response.js";
import { isTerminalStatus, nextActionForStatus } from "./runStatus.js";

export type AgentRunReader = {
  get(runId: string): Promise<AgentRun>;
};

export type WaitForRunResult = {
  run: AgentRun;
  terminal: boolean;
  timedOut: boolean;
};

export async function waitForRun(params: {
  client: AgentRunReader;
  runId: string;
  timeoutSeconds: number;
  pollIntervalMs: number;
}): Promise<WaitForRunResult> {
  const deadline = Date.now() + params.timeoutSeconds * 1000;
  let lastRun = await params.client.get(params.runId);

  while (!isTerminalStatus(lastRun.status) && Date.now() < deadline) {
    const remainingMs = Math.max(0, deadline - Date.now());
    await delay(Math.min(params.pollIntervalMs, remainingMs));
    lastRun = await params.client.get(params.runId);
  }

  return {
    run: lastRun,
    terminal: isTerminalStatus(lastRun.status),
    timedOut: !isTerminalStatus(lastRun.status),
  };
}

export function registerAgentWaitForRunTool(server: McpServer, config?: AgentToolConfig): void {
  server.tool(
    "agent_wait_for_run",
    "Poll an Exa Agent run until it reaches completed/failed/cancelled or a bounded timeout. This is the ergonomic default after agent_create_run.",
    {
      runId: z.string().min(1).describe("The agent_run_... ID returned by agent_create_run."),
      timeoutSeconds: z.coerce.number().optional().describe("Maximum time to wait in this MCP call. Default 45, max 50. Longer runs are handled by calling this tool again."),
      pollIntervalMs: z.coerce.number().optional().describe("Polling interval. Default 4000, min 1000."),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    },
    withAgentTool(
      "agent_wait_for_run",
      config,
      ({ runId }) => runId,
      async ({ runId, timeoutSeconds, pollIntervalMs }, { client }) => {
        const boundedTimeoutSeconds = clampInteger(
          timeoutSeconds,
          API_CONFIG.DEFAULT_WAIT_TIMEOUT_SECONDS,
          1,
          API_CONFIG.MAX_WAIT_TIMEOUT_SECONDS,
        );
        const boundedPollIntervalMs = clampInteger(
          pollIntervalMs,
          API_CONFIG.DEFAULT_POLL_INTERVAL_MS,
          API_CONFIG.MIN_POLL_INTERVAL_MS,
          boundedTimeoutSeconds * 1000,
        );

        const result = await waitForRun({
          client: {
            get: (id) => retryAgentRequest(() => client.agent.runs.get(id)) as Promise<AgentRun>,
          },
          runId,
          timeoutSeconds: boundedTimeoutSeconds,
          pollIntervalMs: boundedPollIntervalMs,
        });
        checkpoint("agent_wait_for_run_complete", {
          status: result.run.status,
          timedOut: result.timedOut,
        });

        return jsonContent({
          success: true,
          id: result.run.id,
          status: result.run.status,
          terminal: result.terminal,
          timedOut: result.timedOut,
          nextAction: result.timedOut
            ? `Run is still ${result.run.status}. Call agent_wait_for_run again with runId "${runId}".`
            : nextActionForStatus(result.run.status, runId),
          run: result.run,
        });
      },
    ),
  );
}
