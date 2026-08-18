import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  MISSING_CREDENTIALS_ERROR,
  resolvePasswordAuthCredentials,
} = require("../src/options-credentials-utils.js");

describe("resolvePasswordAuthCredentials", () => {
  it("returns trimmed email and password when both are present", () => {
    expect(
      resolvePasswordAuthCredentials("  user@example.com  ", "  secret  ")
    ).toEqual({
      ok: true,
      email: "user@example.com",
      password: "secret",
    });
  });

  it("rejects missing email", () => {
    expect(resolvePasswordAuthCredentials("", "secret")).toEqual({
      ok: false,
      error: MISSING_CREDENTIALS_ERROR,
    });
    expect(resolvePasswordAuthCredentials("   ", "secret")).toEqual({
      ok: false,
      error: MISSING_CREDENTIALS_ERROR,
    });
    expect(resolvePasswordAuthCredentials(null, "secret")).toEqual({
      ok: false,
      error: MISSING_CREDENTIALS_ERROR,
    });
  });

  it("rejects missing password (including whitespace-only)", () => {
    expect(resolvePasswordAuthCredentials("user@example.com", "")).toEqual({
      ok: false,
      error: MISSING_CREDENTIALS_ERROR,
    });
    expect(resolvePasswordAuthCredentials("user@example.com", "   ")).toEqual({
      ok: false,
      error: MISSING_CREDENTIALS_ERROR,
    });
    expect(resolvePasswordAuthCredentials("user@example.com", null)).toEqual({
      ok: false,
      error: MISSING_CREDENTIALS_ERROR,
    });
  });

  it("rejects when both are missing", () => {
    expect(resolvePasswordAuthCredentials(undefined, undefined)).toEqual({
      ok: false,
      error: "Please enter both email and password.",
    });
  });
});
