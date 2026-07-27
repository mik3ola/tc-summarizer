import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  CLEARED_SESSION_STORAGE,
  isUnauthorizedBackendError,
  shouldProactivelyRefreshSession,
  resolveProactiveSessionRefresh,
  resolveBackendFailureAction,
  resolveAuthRefreshFailure,
  buildSessionFromRefreshResponse,
  parseBackendErrorResponse,
} = require("../src/auth-session-utils.js");

describe("isUnauthorizedBackendError", () => {
  it("matches 401 / JWT / Unauthorized / Auth failed messages", () => {
    expect(isUnauthorizedBackendError(new Error("Backend error (401): nope"))).toBe(true);
    expect(isUnauthorizedBackendError({ message: "Invalid JWT" })).toBe(true);
    expect(isUnauthorizedBackendError("Unauthorized")).toBe(true);
    expect(isUnauthorizedBackendError(new Error("Auth failed for user"))).toBe(true);
  });

  it("does not match quota or unrelated errors", () => {
    expect(isUnauthorizedBackendError(new Error("Quota exceeded"))).toBe(false);
    expect(isUnauthorizedBackendError(new Error("Network request failed"))).toBe(false);
    expect(isUnauthorizedBackendError(null)).toBe(false);
  });
});

describe("shouldProactivelyRefreshSession", () => {
  it("requires access token, expiry flag, and anon key", () => {
    expect(
      shouldProactivelyRefreshSession({
        hasAccessToken: true,
        isSessionExpired: true,
        hasAnonKey: true,
      })
    ).toBe(true);
    expect(
      shouldProactivelyRefreshSession({
        hasAccessToken: true,
        isSessionExpired: false,
        hasAnonKey: true,
      })
    ).toBe(false);
    expect(
      shouldProactivelyRefreshSession({
        hasAccessToken: false,
        isSessionExpired: true,
        hasAnonKey: true,
      })
    ).toBe(false);
    expect(
      shouldProactivelyRefreshSession({
        hasAccessToken: true,
        isSessionExpired: true,
        hasAnonKey: false,
      })
    ).toBe(false);
  });
});

describe("resolveProactiveSessionRefresh", () => {
  it("keeps refreshed session or clears expired auth", () => {
    expect(resolveProactiveSessionRefresh({ refreshSucceeded: true })).toEqual({
      action: "use_refreshed_session",
    });
    expect(resolveProactiveSessionRefresh({ refreshSucceeded: false })).toEqual({
      action: "clear_expired_session",
    });
  });
});

describe("resolveBackendFailureAction", () => {
  it("prefers Pro own-key fallback on quota exhaustion", () => {
    expect(
      resolveBackendFailureAction({
        error: { quotaExceeded: true, message: "Quota exceeded" },
        canFallbackToOwnKey: true,
      })
    ).toEqual({ action: "own_key_fallback", reason: "quota" });
  });

  it("routes unauthorized errors to auth refresh before generic fallback", () => {
    expect(
      resolveBackendFailureAction({
        error: new Error("Backend error (401): Invalid JWT"),
        canFallbackToOwnKey: true,
      })
    ).toEqual({ action: "auth_refresh" });
  });

  it("falls back to own key for other backend errors when Pro has a key", () => {
    expect(
      resolveBackendFailureAction({
        error: new Error("Backend error (500): boom"),
        canFallbackToOwnKey: true,
      })
    ).toEqual({ action: "own_key_fallback", reason: "backend_error" });
  });

  it("rethrows when free/Pro has no own-key fallback", () => {
    expect(
      resolveBackendFailureAction({
        error: new Error("Backend error (500): boom"),
        canFallbackToOwnKey: false,
      })
    ).toEqual({ action: "rethrow" });
    expect(
      resolveBackendFailureAction({
        error: { status: 429, message: "Quota exceeded" },
        canFallbackToOwnKey: false,
      })
    ).toEqual({ action: "rethrow" });
  });
});

describe("resolveAuthRefreshFailure", () => {
  it("falls back to own key for Pro, otherwise clears session", () => {
    expect(resolveAuthRefreshFailure({ canFallbackToOwnKey: true })).toEqual({
      action: "own_key_fallback",
    });
    expect(resolveAuthRefreshFailure({ canFallbackToOwnKey: false })).toEqual({
      action: "clear_session_and_reauth",
    });
  });
});

describe("buildSessionFromRefreshResponse", () => {
  const now = 1_700_000_000_000;
  const previous = {
    access_token: "old",
    refresh_token: "old-refresh",
    expires_at: now - 1,
    user: { id: "u1", email: "a@example.com" },
  };

  it("returns null without access_token", () => {
    expect(buildSessionFromRefreshResponse({}, previous, now)).toBeNull();
    expect(buildSessionFromRefreshResponse(null, previous, now)).toBeNull();
  });

  it("maps expires_in and preserves previous user when response omits user", () => {
    const next = buildSessionFromRefreshResponse(
      { access_token: "new", refresh_token: "new-refresh", expires_in: 3600 },
      previous,
      now
    );
    expect(next).toEqual({
      access_token: "new",
      refresh_token: "new-refresh",
      expires_at: now + 3600 * 1000,
      user: previous.user,
    });
  });

  it("uses response user when present and treats missing expires_in as 0", () => {
    const next = buildSessionFromRefreshResponse(
      {
        access_token: "new",
        refresh_token: "r2",
        user: { id: "u2", email: "b@example.com" },
      },
      previous,
      now
    );
    expect(next.expires_at).toBe(now);
    expect(next.user).toEqual({ id: "u2", email: "b@example.com" });
  });
});

describe("parseBackendErrorResponse", () => {
  it("preserves quotaExceeded from JSON bodies", () => {
    const parsed = parseBackendErrorResponse(
      429,
      JSON.stringify({ error: "Quota exceeded", quotaExceeded: true })
    );
    expect(parsed.quotaExceeded).toBe(true);
    expect(parsed.status).toBe(429);
    expect(parsed.data.quotaExceeded).toBe(true);
    expect(parsed.message).toContain("Backend error (429)");
  });

  it("handles non-JSON bodies without throwing", () => {
    const parsed = parseBackendErrorResponse(500, "plain text failure");
    expect(parsed.quotaExceeded).toBe(false);
    expect(parsed.data).toBeNull();
    expect(parsed.message).toContain("plain text failure");
  });

  it("truncates long bodies in the error message", () => {
    const long = "x".repeat(500);
    const parsed = parseBackendErrorResponse(502, long);
    expect(parsed.message.length).toBeLessThan(long.length);
    expect(parsed.message).toContain("Backend error (502)");
  });
});

describe("CLEARED_SESSION_STORAGE", () => {
  it("nulls auth and subscription fields used after failed refresh", () => {
    expect(CLEARED_SESSION_STORAGE).toEqual({
      supabaseSession: null,
      subscription: null,
      subscriptionPlan: null,
      userEmail: null,
      monthlyUsage: null,
    });
  });
});
