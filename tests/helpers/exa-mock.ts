/**
 * Mock factory for `exa-js`.
 *
 * Tools route through `new Exa(...).request(endpoint, method, body, query, headers)`,
 * not raw axios. Mock the SDK directly so we can assert on the outbound payload
 * our code constructs.
 *
 * Usage:
 *   import { vi } from "vitest";
 *   import { setExaRequestImpl, ExaError } from "../helpers/exa-mock.js";
 *   vi.mock("exa-js", () => import("../helpers/exa-mock.js"));
 *
 * Then in a test:
 *   setExaRequestImpl(async () => ({ results: [...] }));
 */
import { vi } from "vitest";

/**
 * Mirrors the real `exa-js` ExaError: positional `(message, statusCode, timestamp?, path?)`
 * with `timestamp` auto-defaulting to `new Date().toISOString()`.
 */
export class ExaError extends Error {
  statusCode: number;
  timestamp: string;
  path?: string;

  constructor(message: string, statusCode: number, timestamp?: string, path?: string) {
    super(message);
    this.name = "ExaError";
    this.statusCode = statusCode;
    this.timestamp = timestamp ?? new Date().toISOString();
    this.path = path;
  }
}

type RequestImpl = (
  endpoint: string,
  method: string,
  body: unknown,
  query: unknown,
  headers: Record<string, string> | undefined,
) => Promise<unknown>;

let requestImpl: RequestImpl = async () => {
  throw new Error("exa-mock: no request implementation set; call setExaRequestImpl() in your test");
};

export const requestSpy = vi.fn();

export function setExaRequestImpl(fn: RequestImpl): void {
  requestImpl = fn;
}

export function resetExaMock(): void {
  requestImpl = async () => {
    throw new Error("exa-mock: no request implementation set; call setExaRequestImpl() in your test");
  };
  requestSpy.mockReset();
}

export class Exa {
  apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async request<T>(
    endpoint: string,
    method: string,
    body?: unknown,
    query?: unknown,
    headers?: Record<string, string>,
  ): Promise<T> {
    requestSpy(endpoint, method, body, query, headers);
    return requestImpl(endpoint, method, body, query, headers) as Promise<T>;
  }
}

export default Exa;
