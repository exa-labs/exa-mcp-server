import { describe, expect, it } from "vitest";
import { acceptsMcpResponses } from "../../../src/utils/mcpAccept.js";

describe("acceptsMcpResponses", () => {
  it.each([
    "application/json, text/event-stream",
    "text/event-stream,application/json",
    "APPLICATION/JSON, Text/Event-Stream",
    "application/json;q=0.9, text/event-stream;q=1.0",
    'application/json;note="a, b; c", text/event-stream',
    'application/json;note="escaped \\" quote", text/event-stream',
    "application/json, text/event-stream, */*;q=0.1",
    "application/json,, text/event-stream",
    "application/json, text/event-stream;",
    "application/json;;charset=utf-8, text/event-stream",
    "application/json, text/event-stream, garbage",
    "application/json, text/event-stream, text/html;q=invalid",
  ])("accepts %j", (accept) => {
    expect(acceptsMcpResponses(accept)).toBe(true);
  });

  it.each([
    [null],
    [""],
    ["*/*"],
    ["application/*, text/*"],
    ["application/json"],
    ["text/event-stream"],
    ["application/json, text/event-stream;q=0"],
    ["application/json;q=0.000, text/event-stream"],
    ["application/json;q=1.5, text/event-stream"],
    ["application/json;q=0.5;q=0.5, text/event-stream"],
    ["application/json;charset, text/event-stream"],
    ['application/json;note="unterminated, text/event-stream'],
    ["application/json\n, text/event-stream"],
    ["application/json;text/event-stream"],
    ["application/jsonx, text/event-streamy"],
  ])("rejects %j", (accept) => {
    expect(acceptsMcpResponses(accept)).toBe(false);
  });
});
