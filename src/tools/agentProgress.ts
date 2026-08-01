import type { AgentEvent } from "exa-js";

export const DEFAULT_PROGRESS_THROTTLE_MS = 1_000;

type ToolActivity = {
  name: string;
  started: boolean;
  finished: boolean;
};

export type AgentProgressState = {
  runId: string | null;
  startedAt: number;
  lastMeaningfulAt: number;
  sourcesFound: number;
  sourcesByCallId: Map<string, number>;
  toolsByCallId: Map<string, ToolActivity>;
  latestNarrationByCallId: Map<string, string>;
  latestNarration: string | null;
  latestPreliminaryList: { round: number; entryCount: number } | null;
  lastActivity: string;
};

export type AgentProgressUpdate = {
  state: AgentProgressState;
  kind: "immediate" | "coalesced" | "ignored";
  message?: string;
};

type RecordValue = Record<string, unknown>;

function asRecord(value: unknown): RecordValue | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as RecordValue)
    : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function eventData(event: AgentEvent): RecordValue | undefined {
  return asRecord(event.data);
}

function itemCallId(item: RecordValue): string | undefined {
  return stringValue(item.call_id) ?? stringValue(item.callId);
}

function itemParentCallId(item: RecordValue): string | undefined {
  return stringValue(item.parent_call_id) ?? stringValue(item.parentCallId);
}

function addSource(state: AgentProgressState, callId: string | undefined): void {
  if (callId === undefined) {
    state.sourcesFound += 1;
    return;
  }
  const nextCount = (state.sourcesByCallId.get(callId) ?? 0) + 1;
  state.sourcesByCallId.set(callId, nextCount);
  state.sourcesFound += 1;
}

function toolActivityLabel(tool: string, suffix: "started" | "finished"): string {
  return `${tool} ${suffix}`;
}

export function createAgentProgressState(
  runId: string | null = null,
  now = Date.now(),
): AgentProgressState {
  return {
    runId,
    startedAt: now,
    lastMeaningfulAt: now,
    sourcesFound: 0,
    sourcesByCallId: new Map(),
    toolsByCallId: new Map(),
    latestNarrationByCallId: new Map(),
    latestNarration: null,
    latestPreliminaryList: null,
    lastActivity: "run started",
  };
}

export function ingestAgentEvent(
  state: AgentProgressState,
  event: AgentEvent,
  now = Date.now(),
): AgentProgressUpdate {
  const data = eventData(event);

  if (state.runId === null) {
    const eventRunId = stringValue(data?.id);
    if (eventRunId !== undefined) state.runId = eventRunId;
  }

  if (event.event === "agent_run.created") {
    state.lastMeaningfulAt = now;
    state.lastActivity = "run queued";
    return {
      state,
      kind: "immediate",
      message: `run ${state.runId ?? "pending"} queued`,
    };
  }

  if (event.event === "agent_run.started") {
    state.lastMeaningfulAt = now;
    state.lastActivity = "run started";
    return {
      state,
      kind: "immediate",
      message: `run ${state.runId ?? "pending"} started`,
    };
  }

  if (event.event === "agent_run.preliminary_list") {
    const list = asRecord(data?.preliminaryList);
    const round = numberValue(list?.round);
    const answer = stringValue(list?.answer);
    if (round === undefined || answer === undefined) return { state, kind: "ignored" };
    const entryCount = Array.isArray(list?.entryKeys)
      ? list.entryKeys.length
      : answer.split(/\s*;\s*/).filter(Boolean).length;
    state.latestPreliminaryList = { round, entryCount };
    state.lastMeaningfulAt = now;
    state.lastActivity = `preliminary list round ${round}`;
    return {
      state,
      kind: "immediate",
      message: `preliminary list (round ${round}): ${entryCount} entries`,
    };
  }

  if (event.event === "agent_run.search_trace") {
    const text = stringValue(data?.text);
    if (text === undefined) return { state, kind: "ignored" };
    const callId = stringValue(data?.callId);
    const tool = stringValue(data?.tool);
    if (callId !== undefined) {
      state.latestNarrationByCallId.set(callId, text);
      if (tool !== undefined) {
        const existing = state.toolsByCallId.get(callId) ?? {
          name: tool,
          started: true,
          finished: false,
        };
        existing.name = tool;
        existing.started = true;
        state.toolsByCallId.set(callId, existing);
      }
    }
    state.latestNarration = text;
    state.lastMeaningfulAt = now;
    state.lastActivity = text;
    return { state, kind: "coalesced" };
  }

  if (event.event === "agent_run.source.added") {
    const source = asRecord(data?.source);
    if (stringValue(source?.url) === undefined) return { state, kind: "ignored" };
    addSource(state, stringValue(source?.callId) ?? stringValue(source?.parentCallId));
    state.lastMeaningfulAt = now;
    state.lastActivity = `${state.sourcesFound} sources found`;
    return { state, kind: "coalesced" };
  }

  if (event.event === "agent_run.source.truncated") {
    const callId = stringValue(data?.callId);
    state.lastMeaningfulAt = now;
    state.lastActivity =
      callId === undefined ? "source limit reached" : `source limit reached for ${callId}`;
    return { state, kind: "coalesced" };
  }

  if (
    event.event === "agent_run.output_item.added" ||
    event.event === "agent_run.output_item.done"
  ) {
    const item = asRecord(data?.item);
    const itemId = stringValue(item?.id);
    const callId = item === undefined ? undefined : itemCallId(item);
    const parentCallId = item === undefined ? undefined : itemParentCallId(item);
    const key =
      event.event === "agent_run.output_item.done"
        ? (parentCallId ?? callId ?? itemId)
        : (callId ?? itemId);
    const name = stringValue(item?.name) ?? "tool";
    if (key === undefined) return { state, kind: "ignored" };
    const nestedStarted =
      parentCallId !== undefined && callId !== undefined
        ? state.toolsByCallId.get(callId)
        : undefined;
    if (nestedStarted !== undefined && callId !== undefined && key !== callId) {
      state.toolsByCallId.delete(callId);
    }
    const existing = nestedStarted ??
      state.toolsByCallId.get(key) ?? { name, started: false, finished: false };
    existing.name = name;
    if (event.event.endsWith(".added")) existing.started = true;
    else existing.finished = true;
    state.toolsByCallId.set(key, existing);
    const metadata = asRecord(item?.metadata);
    const metadataSourceCount = numberValue(metadata?.sourceCount);
    state.lastMeaningfulAt = now;
    const suffix = event.event.endsWith(".added") ? "started" : "finished";
    state.lastActivity =
      metadataSourceCount !== undefined && suffix === "finished"
        ? `${toolActivityLabel(name, suffix)} (${metadataSourceCount} sources)`
        : toolActivityLabel(name, suffix);
    return { state, kind: "coalesced" };
  }

  return { state, kind: "ignored" };
}

function latestActivity(state: AgentProgressState): string {
  return state.latestNarration ?? state.lastActivity;
}

export function summarizeAgentProgress(state: AgentProgressState): string {
  const activeTools = [...state.toolsByCallId.values()].filter((tool) => !tool.finished).length;
  const toolCalls = state.toolsByCallId.size;
  const parts = [
    activeTools > 0 ? `working (${activeTools} tool${activeTools === 1 ? "" : "s"})` : "working",
    `${toolCalls} tool call${toolCalls === 1 ? "" : "s"}`,
    `${state.sourcesFound} source${state.sourcesFound === 1 ? "" : "s"}`,
    `latest: ${latestActivity(state)}`,
  ];
  return parts.join(" · ").slice(0, 200);
}

export function heartbeatMessage(state: AgentProgressState, now = Date.now()): string {
  const elapsedSeconds = Math.max(0, Math.floor((now - state.startedAt) / 1_000));
  return `still working (elapsed ${elapsedSeconds}s, ${state.sourcesFound} sources) — last: ${latestActivity(state)}`.slice(
    0,
    200,
  );
}

export class AgentProgressBridge {
  private readonly state: AgentProgressState;
  private readonly emit: (message: string) => Promise<void>;
  private readonly throttleMs: number;
  private readonly now: () => number;
  private trailingTimer: ReturnType<typeof setTimeout> | undefined;
  private pendingTrailing = false;
  private lastCoalescedEmitAt = 0;
  private hasCoalescedEmission = false;
  private closed = false;

  constructor(options: {
    emit: (message: string) => Promise<void>;
    runId?: string | null;
    throttleMs?: number;
    now?: () => number;
  }) {
    this.emit = options.emit;
    this.state = createAgentProgressState(options.runId ?? null, options.now?.() ?? Date.now());
    this.throttleMs = options.throttleMs ?? DEFAULT_PROGRESS_THROTTLE_MS;
    this.now = options.now ?? Date.now;
  }

  getState(): AgentProgressState {
    return this.state;
  }

  async handle(event: AgentEvent): Promise<void> {
    if (this.closed) return;
    const update = ingestAgentEvent(this.state, event, this.now());
    if (update.kind === "ignored") return;
    if (update.kind === "immediate") {
      if (update.message === undefined) return;
      await this.flushTrailing();
      await this.emit(update.message);
      return;
    }

    const current = this.now();
    if (!this.hasCoalescedEmission || current - this.lastCoalescedEmitAt >= this.throttleMs) {
      this.lastCoalescedEmitAt = current;
      this.hasCoalescedEmission = true;
      await this.emit(summarizeAgentProgress(this.state));
      return;
    }

    this.pendingTrailing = true;
    this.scheduleTrailing(this.throttleMs - (current - this.lastCoalescedEmitAt));
  }

  private scheduleTrailing(delayMs: number): void {
    if (this.trailingTimer !== undefined) return;
    this.trailingTimer = setTimeout(
      () => {
        this.trailingTimer = undefined;
        void this.flushTrailing();
      },
      Math.max(1, delayMs),
    );
  }

  private async flushTrailing(): Promise<void> {
    if (!this.pendingTrailing || this.closed) return;
    this.pendingTrailing = false;
    this.lastCoalescedEmitAt = this.now();
    this.hasCoalescedEmission = true;
    await this.emit(summarizeAgentProgress(this.state));
  }

  async cleanup(): Promise<void> {
    if (this.trailingTimer !== undefined) clearTimeout(this.trailingTimer);
    this.trailingTimer = undefined;
    await this.flushTrailing();
    this.closed = true;
  }
}
