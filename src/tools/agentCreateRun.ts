import type { CreateAgentRunParams } from "exa-js";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { checkpoint } from "agnost";
import type { AgentEffort, AgentRunInput } from "../types.js";
import { withAgentTool, type AgentToolConfig } from "../utils/agentTool.js";
import { jsonContent } from "../utils/response.js";

const effortSchema = z.enum(["minimal", "low", "medium", "high", "xhigh", "auto"]);
const recordSchema = z.record(z.unknown());
const dataSourceProviderSchema = z.enum([
  "fiber_ai",
  "financial_datasets",
  "similar_web",
  "baselayer",
  "affiliate",
  "particle_news",
  "jinko",
]);

export function registerAgentCreateRunTool(server: McpServer, config?: AgentToolConfig): void {
  server.tool(
    "agent_create_run",
    "Create an async Exa Agent run for multi-step research, list-building, enrichment, or structured output. Returns an agent_run_... ID immediately; poll with agent_wait_for_run before reading final output. Every run should include outputSchema when repeatable structured results are needed.",
    {
      query: z.string().min(1).describe("Natural-language research or enrichment objective."),
      systemPrompt: z.string().optional().describe("Optional system-level guidance for the Agent."),
      outputSchema: recordSchema.optional().describe("Optional JSON Schema for output. Prefer a top-level object with bounded arrays and source/evidence fields."),
      input: z.object({
        data: z.array(recordSchema).optional().describe("Known rows/entities to enrich or process."),
        exclusion: z.array(recordSchema).optional().describe("Entities, rows, or records Agent should avoid returning again."),
      }).optional(),
      dataSources: z.array(z.object({
        provider: dataSourceProviderSchema.describe("Exa Connect provider to enable for the run."),
      })).max(5).optional().describe("Optional Exa Connect providers to enable for this run. Usable self-serve providers: fiber_ai, financial_datasets, similar_web, baselayer, affiliate, particle_news, jinko."),
      previousRunId: z.string().optional().describe("Completed prior agent_run_... ID to continue from."),
      effort: effortSchema.optional().describe("Agent effort: minimal, low, medium, high, xhigh, or auto. Defaults to auto."),
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
    },
    withAgentTool(
      "agent_create_run",
      config,
      ({ query }) => query.slice(0, 120),
      async ({ query, systemPrompt, outputSchema, input, dataSources, previousRunId, effort }, { client }) => {
        const runInput: AgentRunInput = {
          query,
          ...(systemPrompt != null ? { systemPrompt } : {}),
          ...(outputSchema != null ? { outputSchema } : {}),
          ...(input != null ? { input } : {}),
          ...(dataSources != null ? { dataSources } : {}),
          ...(previousRunId != null ? { previousRunId } : {}),
          effort: (effort ?? "auto") as AgentEffort,
        };

        checkpoint("agent_create_run_request_prepared", {
          hasSchema: outputSchema != null,
          hasInputData: input?.data != null,
          hasDataSources: dataSources != null,
          hasPreviousRunId: previousRunId != null,
          effort: runInput.effort,
        });

        const run = await client.agent.runs.create(runInput as CreateAgentRunParams);
        checkpoint("agent_create_run_response_received", { status: run.status });

        return jsonContent({
          success: true,
          id: run.id,
          status: run.status,
          createdAt: run.createdAt,
          previousRunId: previousRunId ?? null,
          nextAction: `Call agent_wait_for_run with runId "${run.id}".`,
          run,
        });
      },
    ),
  );
}
