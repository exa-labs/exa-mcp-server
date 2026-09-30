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
    description:
      "Advanced web search with full Exa API control including category filters, domain restrictions, date ranges, highlights, summaries, and subpage crawling",
    enabled: false,
    group: "search",
  },
  web_fetch_exa: {
    name: "Web Crawling",
    description: "Extract content from specific URLs",
    enabled: true,
    group: "search",
  },
  agent_run: {
    name: "Run Exa Agent",
    description:
      "Run an Exa Agent for multi-step research, list-building, enrichment, or structured output. Returns the final output or a run ID for retained-run continuation.",
    enabled: true,
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
