export function isTerminalStatus(status: string): boolean {
  return status === "completed" || status === "failed" || status === "cancelled";
}

export function nextActionForStatus(status: string, runId: string): string {
  if (status === "completed") {
    return `Call agent_get_run_output with runId "${runId}" to retrieve text, structured output, grounding, usage, and cost.`;
  }
  if (status === "failed") {
    return "The run failed. Create a corrected run if the issue is clear, or retry agent_get_run_output later if you are waiting on final state propagation.";
  }
  if (status === "cancelled") {
    return "The run was cancelled. Create a new run if the task still needs to be completed.";
  }
  return `Call agent_wait_for_run again with runId "${runId}".`;
}
