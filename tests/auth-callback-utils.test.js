import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { resolveExternalAuthCallback } = require("../src/auth-callback-utils.js");

describe("resolveExternalAuthCallback", () => {
  it("ignores non-auth_callback or missing token (no storage write)", () => {
    expect(resolveExternalAuthCallback(null)).toEqual({
      handled: false,
      storagePatch: null,
    });
    expect(resolveExternalAuthCallback({})).toEqual({
      handled: false,
      storagePatch: null,
    });
    expect(
      resolveExternalAuthCallback({ type: "auth_callback" })
    ).toEqual({ handled: false, storagePatch: null });
    expect(
      resolveExternalAuthCallback({ type: "auth_callback", token: "" })
    ).toEqual({ handled: false, storagePatch: null });
    expect(
      resolveExternalAuthCallback({ type: "other", token: "abc" })
    ).toEqual({ handled: false, storagePatch: null });
  });

  it("activates subscription and uses email when provided", () => {
    expect(
      resolveExternalAuthCallback({
        type: "auth_callback",
        token: "opaque-token",
        email: "user@example.com",
      })
    ).toEqual({
      handled: true,
      storagePatch: {
        subscription: "active",
        userEmail: "user@example.com",
      },
    });
  });

  it("falls back to Subscriber and does not persist the token", () => {
    const result = resolveExternalAuthCallback({
      type: "auth_callback",
      token: "opaque-token",
    });
    expect(result).toEqual({
      handled: true,
      storagePatch: {
        subscription: "active",
        userEmail: "Subscriber",
      },
    });
    expect(result.storagePatch).not.toHaveProperty("token");
    expect(result.storagePatch).not.toHaveProperty("supabaseSession");
  });
});
