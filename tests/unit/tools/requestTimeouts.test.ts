import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeMcpServer } from "../../helpers/fakeMcpServer.js";
import { registerCompanyResearchTool } from "../../../src/tools/companyResearch.js";
import { registerDeepResearchCheckTool } from "../../../src/tools/deepResearchCheck.js";
import { registerDeepResearchStartTool } from "../../../src/tools/deepResearchStart.js";
import { registerDeepSearchTool } from "../../../src/tools/deepSearch.js";
import { registerExaCodeTool } from "../../../src/tools/exaCode.js";
import { registerLinkedInSearchTool } from "../../../src/tools/linkedInSearch.js";
import { registerPeopleSearchTool } from "../../../src/tools/peopleSearch.js";

const { ExaMock, requestMock } = vi.hoisted(() => {
  const requestMock = vi.fn();
  class ExaMock {
    request = requestMock;
  }

  return { ExaMock, requestMock };
});

vi.mock("exa-js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("exa-js")>()),
  Exa: ExaMock,
}));

vi.mock("agnost", () => ({
  checkpoint: vi.fn(),
}));

type Case = {
  tool: string;
  register: (server: any, config: any) => void;
  args: Record<string, unknown>;
  timeoutMs: number;
  // deep_researcher_check waits 5 s before it calls the API
  delayMs?: number;
};

const cases: Case[] = [
  {
    tool: "company_research_exa",
    register: registerCompanyResearchTool,
    args: { companyName: "Exa" },
    timeoutMs: 60_000,
  },
  {
    tool: "people_search_exa",
    register: registerPeopleSearchTool,
    args: { query: "engineers" },
    timeoutMs: 60_000,
  },
  {
    tool: "linkedin_search_exa",
    register: registerLinkedInSearchTool,
    args: { query: "engineers" },
    timeoutMs: 60_000,
  },
  {
    tool: "get_code_context_exa",
    register: registerExaCodeTool,
    args: { query: "react hooks" },
    timeoutMs: 60_000,
  },
  {
    tool: "deep_search_exa",
    register: registerDeepSearchTool,
    args: { objective: "history of the transistor" },
    timeoutMs: 300_000,
  },
  {
    tool: "deep_researcher_start",
    register: registerDeepResearchStartTool,
    args: { instructions: "summarize recent work on MCP" },
    timeoutMs: 60_000,
  },
  {
    tool: "deep_researcher_check",
    register: registerDeepResearchCheckTool,
    args: { researchId: "r_123" },
    timeoutMs: 60_000,
    delayMs: 5_000,
  },
];

describe("tools time out when the Exa API never answers", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    requestMock.mockReturnValue(new Promise(() => undefined));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(cases)("$tool returns a tool error after its timeout", async (c) => {
    const server = new FakeMcpServer();
    c.register(server, { exaApiKey: "test-key", userProvidedApiKey: true });

    let settled: unknown;
    const pending = Promise.resolve(server.getTool(c.tool).handler(c.args)).then((r) => {
      settled = r;
      return r;
    });

    await vi.advanceTimersByTimeAsync((c.delayMs ?? 0) + c.timeoutMs - 1);
    expect(settled).toBeUndefined();

    await vi.advanceTimersByTimeAsync(1);
    const result = (await pending) as any;
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain(`${c.tool} timed out after ${c.timeoutMs / 1000}s`);
  });
});
