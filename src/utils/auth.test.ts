import { describe, it, expect, vi, beforeEach } from "vitest";

import { isJwtToken } from "./auth.js";

vi.mock("jose", () => ({
  jwtVerify: vi.fn(),
  createRemoteJWKSet: vi.fn(() => "fake-jwks-set"),
}));

import * as jose from "jose";
import { verifyOAuthToken } from "./auth.js";

describe("isJwtToken", () => {
  it("accepts a 3-segment base64url-looking token", () => {
    expect(isJwtToken("aaa.bbb.ccc")).toBe(true);
    expect(isJwtToken("a-_AZ09.b.c")).toBe(true);
  });

  it("rejects tokens without exactly 3 segments", () => {
    expect(isJwtToken("aaa.bbb")).toBe(false);
    expect(isJwtToken("aaa.bbb.ccc.ddd")).toBe(false);
    expect(isJwtToken("plain-api-key")).toBe(false);
  });

  it("rejects tokens with empty segments", () => {
    expect(isJwtToken("aaa..ccc")).toBe(false);
    expect(isJwtToken(".bbb.ccc")).toBe(false);
    expect(isJwtToken("aaa.bbb.")).toBe(false);
  });

  it("rejects tokens with non-base64url chars", () => {
    expect(isJwtToken("aaa.bbb.cc!c")).toBe(false);
    expect(isJwtToken("aa+a.bbb.ccc")).toBe(false);
    expect(isJwtToken("aaa.b/bb.ccc")).toBe(false);
  });
});

describe("verifyOAuthToken", () => {
  const mockedVerify = jose.jwtVerify as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockedVerify.mockReset();
  });

  it("returns claims for a well-formed token", async () => {
    mockedVerify.mockResolvedValue({
      payload: {
        sub: "user_1",
        "exa:team_id": "team_xyz",
        "exa:api_key_id": "key_abc",
        scope: "read",
      },
    });

    const result = await verifyOAuthToken("a.b.c");
    expect(result).toEqual({
      sub: "user_1",
      "exa:team_id": "team_xyz",
      "exa:api_key_id": "key_abc",
      scope: "read",
    });
  });

  it("returns null when required exa claims are missing", async () => {
    mockedVerify.mockResolvedValue({
      payload: { sub: "user_1", "exa:team_id": "team_xyz" },
    });
    expect(await verifyOAuthToken("a.b.c")).toBeNull();
  });

  it("returns null when verify throws", async () => {
    mockedVerify.mockRejectedValue(new Error("expired"));
    expect(await verifyOAuthToken("a.b.c")).toBeNull();
  });

  it("defaults missing scope to undefined", async () => {
    mockedVerify.mockResolvedValue({
      payload: {
        sub: "user_1",
        "exa:team_id": "team_xyz",
        "exa:api_key_id": "key_abc",
      },
    });

    const result = await verifyOAuthToken("a.b.c");
    expect(result?.scope).toBeUndefined();
  });
});
