import { ExaDeepSearchResponse, ExaSearchResponse } from "../types.js";

const SENSITIVE_RESPONSE_KEYS = new Set(["requestTags"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const sanitized = value.filter((item): item is string => typeof item === "string");
  return sanitized.length > 0 ? sanitized : undefined;
}

function sanitizeNumberArray(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const sanitized = value.filter((item): item is number => typeof item === "number");
  return sanitized.length > 0 ? sanitized : undefined;
}

function sanitizeObjectArray(value: unknown): Record<string, unknown>[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const sanitized = value
    .map((item) => stripSensitiveKeys(item))
    .filter((item): item is Record<string, unknown> => isRecord(item));

  return sanitized.length > 0 ? sanitized : undefined;
}

function sanitizeStatuses(value: unknown): Array<{ id: string; status: string; source: string }> | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const sanitized = value
    .map((status) => {
      if (!isRecord(status)) {
        return null;
      }

      const { id, status: state, source } = status;
      if (typeof id !== "string" || typeof state !== "string" || typeof source !== "string") {
        return null;
      }

      return { id, status: state, source };
    })
    .filter((status): status is { id: string; status: string; source: string } => status !== null);

  return sanitized.length > 0 ? sanitized : undefined;
}

function sanitizeExtras(value: unknown): { links?: string[]; imageLinks?: string[] } | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const sanitized: { links?: string[]; imageLinks?: string[] } = {};

  const links = sanitizeStringArray(value.links);
  if (links) {
    sanitized.links = links;
  }

  const imageLinks = sanitizeStringArray(value.imageLinks);
  if (imageLinks) {
    sanitized.imageLinks = imageLinks;
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

function sanitizeSearchOutput(value: unknown): Record<string, unknown> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const sanitized: Record<string, unknown> = {};

  if ("content" in value) {
    sanitized.content = stripSensitiveKeys(value.content);
  }

  if (Array.isArray(value.grounding)) {
    const grounding = value.grounding
      .map((entry) => {
        if (!isRecord(entry)) {
          return null;
        }

        const citations = Array.isArray(entry.citations)
          ? entry.citations
              .map((citation) => {
                if (!isRecord(citation)) {
                  return null;
                }

                const { url, title } = citation;
                if (typeof url !== "string" || typeof title !== "string") {
                  return null;
                }

                return { url, title };
              })
              .filter((citation): citation is { url: string; title: string } => citation !== null)
          : [];

        const result: Record<string, unknown> = { citations };

        if (typeof entry.field === "string") {
          result.field = entry.field;
        }

        if (typeof entry.confidence === "string") {
          result.confidence = entry.confidence;
        }

        return result;
      })
      .filter((entry): entry is Record<string, unknown> => entry !== null);

    if (grounding.length > 0) {
      sanitized.grounding = grounding;
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

export function stripSensitiveKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stripSensitiveKeys(item));
  }

  if (!isRecord(value)) {
    return value;
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, nestedValue] of Object.entries(value)) {
    if (SENSITIVE_RESPONSE_KEYS.has(key)) {
      continue;
    }

    sanitized[key] = stripSensitiveKeys(nestedValue);
  }

  return sanitized;
}

export function sanitizeSearchResult(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) {
    return null;
  }

  const sanitized: Record<string, unknown> = {};

  const stringFields = ["id", "url", "publishedDate", "author", "text", "summary", "image", "favicon"] as const;
  for (const field of stringFields) {
    if (typeof value[field] === "string") {
      sanitized[field] = value[field];
    }
  }

  if (typeof value.title === "string" || value.title === null) {
    sanitized.title = value.title;
  }

  if (typeof value.score === "number") {
    sanitized.score = value.score;
  }

  const highlights = sanitizeStringArray(value.highlights);
  if (highlights) {
    sanitized.highlights = highlights;
  }

  const highlightScores = sanitizeNumberArray(value.highlightScores);
  if (highlightScores) {
    sanitized.highlightScores = highlightScores;
  }

  const entities = sanitizeObjectArray(value.entities);
  if (entities) {
    sanitized.entities = entities;
  }

  const extras = sanitizeExtras(value.extras);
  if (extras) {
    sanitized.extras = extras;
  }

  if (Array.isArray(value.subpages)) {
    const subpages = value.subpages
      .map((subpage) => sanitizeSearchResult(subpage))
      .filter((subpage): subpage is Record<string, unknown> => subpage !== null);

    if (subpages.length > 0) {
      sanitized.subpages = subpages;
    }
  }

  return sanitized;
}

function sanitizeSearchResults(value: unknown): Record<string, unknown>[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const sanitized = value
    .map((result) => sanitizeSearchResult(result))
    .filter((result): result is Record<string, unknown> => result !== null);

  return sanitized.length > 0 ? sanitized : undefined;
}

function sanitizeTopLevelResponse(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    return {};
  }

  const sanitized: Record<string, unknown> = {};

  if (typeof value.requestId === "string") {
    sanitized.requestId = value.requestId;
  }

  if (typeof value.autopromptString === "string") {
    sanitized.autopromptString = value.autopromptString;
  }

  if (typeof value.autoDate === "string") {
    sanitized.autoDate = value.autoDate;
  }

  if (typeof value.resolvedSearchType === "string") {
    sanitized.resolvedSearchType = value.resolvedSearchType;
  }

  if (typeof value.context === "string") {
    sanitized.context = value.context;
  }

  const output = sanitizeSearchOutput(value.output);
  if (output) {
    sanitized.output = output;
  }

  const statuses = sanitizeStatuses(value.statuses);
  if (statuses) {
    sanitized.statuses = statuses;
  }

  const results = sanitizeSearchResults(value.results);
  if (results) {
    sanitized.results = results;
  }

  if (typeof value.searchTime === "number") {
    sanitized.searchTime = value.searchTime;
  }

  const costDollars = stripSensitiveKeys(value.costDollars);
  if (isRecord(costDollars)) {
    sanitized.costDollars = costDollars;
  }

  return sanitized;
}

export function sanitizeSearchResponse(response: ExaSearchResponse | unknown): Record<string, unknown> {
  return sanitizeTopLevelResponse(response);
}

export function sanitizeDeepSearchStructuredResponse(response: ExaDeepSearchResponse | unknown): Record<string, unknown> {
  const sanitized = sanitizeTopLevelResponse(response);
  const structured: Record<string, unknown> = {};

  if ("output" in sanitized && isRecord(sanitized.output)) {
    const output = { ...sanitized.output };
    if (isRecord(response) && isRecord((response as Record<string, unknown>).output)) {
      output.content = ((response as Record<string, unknown>).output as Record<string, unknown>).content;
    }
    structured.output = output;
  }

  if ("results" in sanitized) {
    structured.results = sanitized.results;
  }

  if ("searchTime" in sanitized) {
    structured.searchTime = sanitized.searchTime;
  }

  if ("costDollars" in sanitized) {
    structured.costDollars = sanitized.costDollars;
  }

  return structured;
}

export function sanitizeContentsResponse(response: unknown): Record<string, unknown> {
  return sanitizeTopLevelResponse(response);
}
