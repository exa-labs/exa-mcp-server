export type ToolGroup = "search" | "agent";

export type ToolMetadata = {
  name: string;
  description: string;
  enabled: boolean;
  group: ToolGroup;
  requiresUserProvidedApiKey?: boolean;
};

export const TOOL_REGISTRY = {
  web_search_exa: {
    name: "Web Search (Exa)",
    description: "Real-time web search using Exa AI",
    enabled: true,
    group: "search",
  },
  web_search_advanced_exa: {
    name: "Advanced Web Search (Exa)",
    description: "Advanced web search with full Exa API control including category filters, domain restrictions, date ranges, highlights, summaries, and subpage crawling",
    enabled: false,
    group: "search",
  },
  get_code_context_exa: {
    name: "Code Context Search (Deprecated)",
    description: "Deprecated: Use web_search_exa instead. Search for code snippets, examples, and documentation from open source repositories",
    enabled: false,
    group: "search",
  },
  company_research_exa: {
    name: "Company Research (Deprecated)",
    description: "Deprecated: Use web_search_advanced_exa instead. Research companies and organizations",
    enabled: false,
    group: "search",
  },
  web_fetch_exa: {
    name: "Web Crawling",
    description: "Extract content from specific URLs",
    enabled: true,
    group: "search",
  },
  deep_researcher_start: {
    name: "Deep Researcher Start (Deprecated)",
    description: "Deprecated: Start a comprehensive AI research task",
    enabled: false,
    group: "search",
    requiresUserProvidedApiKey: true,
  },
  deep_researcher_check: {
    name: "Deep Researcher Check (Deprecated)",
    description: "Deprecated: Check status and retrieve results of research task",
    enabled: false,
    group: "search",
    requiresUserProvidedApiKey: true,
  },
  people_search_exa: {
    name: "People Search (Deprecated)",
    description: "Deprecated: Use web_search_advanced_exa instead. Search for people and professional profiles",
    enabled: false,
    group: "search",
  },
  linkedin_search_exa: {
    name: "LinkedIn Search (Deprecated)",
    description: "Deprecated: Use web_search_advanced_exa instead",
    enabled: false,
    group: "search",
  },
  deep_search_exa: {
    name: "Deep Search (Deprecated)",
    description: "Deprecated: Use web_search_advanced_exa instead. Deep search with query expansion and synthesized answers (requires API key)",
    enabled: false,
    group: "search",
    requiresUserProvidedApiKey: true,
  },
  crawling_exa: {
    name: "Web Crawling (Deprecated)",
    description: "Deprecated: Use web_fetch_exa instead. Extract content from specific URLs",
    enabled: false,
    group: "search",
  },
  agent_create_run: {
    name: "Create Exa Agent Run",
    description: "Start an async Exa Agent run for multi-step research, list-building, enrichment, or structured output.",
    enabled: false,
    group: "agent",
    requiresUserProvidedApiKey: true,
  },
  agent_wait_for_run: {
    name: "Wait for Exa Agent Run",
    description: "Poll an Exa Agent run until terminal status or a bounded timeout.",
    enabled: false,
    group: "agent",
    requiresUserProvidedApiKey: true,
  },
  agent_get_run_output: {
    name: "Get Exa Agent Run Output",
    description: "Retrieve completed text, structured output, grounding, usage, and cost.",
    enabled: false,
    group: "agent",
    requiresUserProvidedApiKey: true,
  },
  agent_cancel_run: {
    name: "Cancel Exa Agent Run",
    description: "Cancel a queued or running Exa Agent run.",
    enabled: false,
    group: "agent",
    requiresUserProvidedApiKey: true,
  },
} as const satisfies Record<string, ToolMetadata>;

export type ToolId = keyof typeof TOOL_REGISTRY;

export const AVAILABLE_TOOL_IDS = Object.keys(TOOL_REGISTRY) as ToolId[];

export const AGENT_TOOL_IDS = AVAILABLE_TOOL_IDS.filter(
  (toolId) => TOOL_REGISTRY[toolId].group === "agent",
);

export const TOOL_SELECTION_ALIASES = {
  agent_tools: AGENT_TOOL_IDS,
} as const;

export type ToolSelectionValue = ToolId | keyof typeof TOOL_SELECTION_ALIASES;

export const AVAILABLE_TOOL_SELECTION_VALUES = [
  ...AVAILABLE_TOOL_IDS,
  ...Object.keys(TOOL_SELECTION_ALIASES),
] as ToolSelectionValue[];

export function isToolEnabledByDefault(toolId: ToolId): boolean {
  return TOOL_REGISTRY[toolId].enabled;
}

export function requiresUserProvidedApiKey(toolId: ToolId): boolean {
  const tool = TOOL_REGISTRY[toolId];
  return "requiresUserProvidedApiKey" in tool && tool.requiresUserProvidedApiKey === true;
}

export function isAgentTool(toolId: ToolId): boolean {
  return TOOL_REGISTRY[toolId].group === "agent";
}

export function listToolMetadata(registeredTools: string[]) {
  return AVAILABLE_TOOL_IDS.map((toolId) => ({
    id: toolId,
    name: TOOL_REGISTRY[toolId].name,
    description: TOOL_REGISTRY[toolId].description,
    enabled: registeredTools.includes(toolId),
  }));
}

export function expandToolSelection(values: string[]): ToolId[] {
  const expanded: ToolId[] = [];
  const seen = new Set<ToolId>();

  for (const value of values) {
    const aliasTools = TOOL_SELECTION_ALIASES[value as keyof typeof TOOL_SELECTION_ALIASES];
    const toolIds = aliasTools ?? [value as ToolId];

    for (const toolId of toolIds) {
      if (!(toolId in TOOL_REGISTRY) || seen.has(toolId)) {
        continue;
      }

      seen.add(toolId);
      expanded.push(toolId);
    }
  }

  return expanded;
}
