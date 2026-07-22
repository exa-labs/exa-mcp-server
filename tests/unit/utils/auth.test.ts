import { beforeEach, describe, expect, it, vi } from "vitest";

// jose does remote JWKS fetching + signature verification. Mock it so we can
// drive the claim-shaping logic in verifyOAuthToken deterministically and
// offline. The hoisted mocks keep a stable identity across vi.resetModules().
const { jwtVerifyMock, createRemoteJWKSetMock } = vi.hoisted(() => ({
  jwtVerifyMock: vi.fn(),
  createRemoteJWKSetMock: vi.fn(() => "fake-jwks"),
}));

vi.mock("jose", () => ({
  jwtVerify: jwtVerifyMock,
  createRemoteJWKSet: createRemoteJWKSetMock,
}));

async function importAuth() {
  return import("../../../src/utils/auth.js");
}

describe("src/utils/auth", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    createRemoteJWKSetMock.mockReturnValue("fake-jwks");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    // Force the module to load with its default issuer/audience.
    delete process.env.OAUTH_ISSUER;
    delete process.env.OAUTH_AUDIENCE;
  });

  describe("isJwtToken", () => {
    it("accepts three non-empty base64url segments", async () => {
      const { isJwtToken } = await importAuth();
      expect(isJwtToken("aGVhZGVy.cGF5bG9hZA.c2lnbmF0dXJl")).toBe(true);
      expect(isJwtToken("aA.bB.cC-_")).toBe(true);
    });

    it("rejects tokens that are not exactly three dot-separated segments", async () => {
      const { isJwtToken } = await importAuth();
      expect(isJwtToken("plain-exa-api-key")).toBe(false);
      expect(isJwtToken("only.two")).toBe(false);
      expect(isJwtToken("a.b.c.d")).toBe(false);
    });

    it("rejects empty segments and non-base64url characters", async () => {
      const { isJwtToken } = await importAuth();
      expect(isJwtToken("a..c")).toBe(false);
      expect(isJwtToken("a.b.")).toBe(false);
      expect(isJwtToken("has+plus.and/slash.pad=")).toBe(false);
      expect(isJwtToken("has space.b.c")).toBe(false);
    });
  });

  describe("verifyOAuthToken", () => {
    it("returns validated claims including the exa:api_key_id claim when present", async () => {
      jwtVerifyMock.mockResolvedValue({
        payload: {
          sub: "user-1",
          "exa:team_id": "team-1",
          "exa:api_key_id": "key-abc",
          scope: "mcp:tools",
        },
      });

      const { verifyOAuthToken } = await importAuth();
      await expect(verifyOAuthToken("jwt")).resolves.toEqual({
        sub: "user-1",
        "exa:team_id": "team-1",
        "exa:api_key_id": "key-abc",
        scope: "mcp:tools",
      });
    });

    it("omits exa:api_key_id when the claim is absent (scope stays present but undefined)", async () => {
      jwtVerifyMock.mockResolvedValue({
        payload: { sub: "user-1", "exa:team_id": "team-1" },
      });

      const { verifyOAuthToken } = await importAuth();
      const claims = await verifyOAuthToken("jwt");

      expect(claims).toMatchObject({ sub: "user-1", "exa:team_id": "team-1" });
      expect(claims).not.toHaveProperty("exa:api_key_id");
      expect(claims?.scope).toBeUndefined();
    });

    it("verifies against the configured issuer and audience", async () => {
      jwtVerifyMock.mockResolvedValue({
        payload: { sub: "s", "exa:team_id": "team-1" },
      });

      const { verifyOAuthToken } = await importAuth();
      await verifyOAuthToken("jwt");

      expect(jwtVerifyMock).toHaveBeenCalledWith("jwt", "fake-jwks", {
        issuer: "https://auth.exa.ai",
        audience: "https://mcp.exa.ai",
      });
    });

    it("returns null when the required exa:team_id claim is missing", async () => {
      jwtVerifyMock.mockResolvedValue({
        payload: { sub: "user-1", "exa:api_key_id": "key-abc" },
      });

      const { verifyOAuthToken } = await importAuth();
      await expect(verifyOAuthToken("jwt")).resolves.toBeNull();
    });

    it("returns null when verification throws (bad signature, expiry, wrong issuer/audience)", async () => {
      jwtVerifyMock.mockRejectedValue(new Error("signature verification failed"));

      const { verifyOAuthToken } = await importAuth();
      await expect(verifyOAuthToken("jwt")).resolves.toBeNull();
    });
  });
});
