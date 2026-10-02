import { ExaError } from "exa-js";
import { describe, expect, it } from "vitest";
import { EXA_BILLING_URL, formatAgentToolError } from "../../../src/utils/agentErrorHandler.js";

describe("formatAgentToolError", () => {
  it("marks 402 as not retryable and points at billing", () => {
    const result = formatAgentToolError(
      new ExaError("You have exceeded your credits limit.", 402),
      "agent_run",
    );

    expect(result.isError).toBe(true);
    const text = result.content[0].text;
    expect(text).toContain("agent_run error (402): You have exceeded your credits limit.");
    expect(text).toContain("Not retryable");
    expect(text).toContain("Do not call agent_run again");
    expect(text).toContain(EXA_BILLING_URL);
  });

  it("keeps the API message and adds no guidance for statuses without one", () => {
    const result = formatAgentToolError(new ExaError("Something went wrong.", 500), "agent_run");

    expect(result).toEqual({
      content: [{ type: "text", text: "agent_run error (500): Something went wrong." }],
      isError: true,
    });
  });

  it("formats non-Exa errors with the tool name", () => {
    const result = formatAgentToolError(
      new Error("Provide exactly one of query or runId."),
      "agent_run",
    );

    expect(result).toEqual({
      content: [{ type: "text", text: "agent_run error: Provide exactly one of query or runId." }],
      isError: true,
    });
  });
});
