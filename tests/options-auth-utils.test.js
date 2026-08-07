import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  buildSessionFromPasswordGrantResponse,
  resolveSignupUiOutcome,
  extractAuthApiErrorMessage,
} = require("../src/options-auth-utils.js");

describe("buildSessionFromPasswordGrantResponse", () => {
  it("maps user id/email when present and computes expires_at from expires_in", () => {
    const now = 1_700_000_000_000;
    expect(
      buildSessionFromPasswordGrantResponse(
        {
          access_token: "at",
          refresh_token: "rt",
          expires_in: 60,
          user: { id: "u1", email: "a@b.com" },
        },
        "form@example.com",
        now
      )
    ).toEqual({
      access_token: "at",
      refresh_token: "rt",
      expires_at: now + 60_000,
      user: { id: "u1", email: "a@b.com" },
    });
  });

  it("falls back to form email when data.user is missing", () => {
    const now = 1_700_000_000_000;
    expect(
      buildSessionFromPasswordGrantResponse(
        { access_token: "at", refresh_token: "rt", expires_in: 0 },
        "form@example.com",
        now
      )
    ).toEqual({
      access_token: "at",
      refresh_token: "rt",
      expires_at: now,
      user: { email: "form@example.com" },
    });
  });

  it("treats missing expires_in as 0 seconds", () => {
    const now = 1000;
    expect(
      buildSessionFromPasswordGrantResponse(
        { access_token: "at", refresh_token: "rt" },
        "x@y.z",
        now
      ).expires_at
    ).toBe(1000);
  });
});

describe("resolveSignupUiOutcome", () => {
  it("asks for email verification when confirmation_sent_at is set on user", () => {
    expect(
      resolveSignupUiOutcome({
        user: { id: "u1", confirmation_sent_at: "2026-01-01T00:00:00Z" },
      })
    ).toEqual({
      kind: "needs_email_confirm",
      title: "Account created!",
      message:
        "Please check your email to verify your account, then come back and sign in.",
    });
  });

  it("also detects top-level confirmation_sent_at", () => {
    expect(
      resolveSignupUiOutcome({
        id: "u2",
        confirmation_sent_at: "2026-01-01T00:00:00Z",
      }).kind
    ).toBe("needs_email_confirm");
  });

  it("ready_to_sign_in when user id present without confirmation_sent_at", () => {
    expect(resolveSignupUiOutcome({ user: { id: "u1" } })).toEqual({
      kind: "ready_to_sign_in",
      title: "Account created!",
      message: "You can now sign in with your email and password.",
    });
  });

  it("surfaces nested error objects", () => {
    expect(
      resolveSignupUiOutcome({ error: { message: "User already registered" } })
    ).toEqual({
      kind: "error",
      message: "User already registered",
    });
  });

  it("ambiguous_success for sparse success-shaped bodies", () => {
    expect(resolveSignupUiOutcome({})).toEqual({
      kind: "ambiguous_success",
      title: "Account created!",
      message: "Please check your email or try signing in.",
    });
  });
});

describe("extractAuthApiErrorMessage", () => {
  it("prefers msg for signup-shaped payloads when checkMsg is true", () => {
    expect(
      extractAuthApiErrorMessage(
        { msg: "from-msg", error_description: "from-desc" },
        "fallback",
        { checkMsg: true }
      )
    ).toBe("from-msg");
  });

  it("prefers error_description for sign-in-shaped payloads", () => {
    expect(
      extractAuthApiErrorMessage(
        { error_description: "Invalid login", message: "msg" },
        "fallback"
      )
    ).toBe("Invalid login");
  });

  it("falls through to nested error.message then fallback", () => {
    expect(
      extractAuthApiErrorMessage({ error: { message: "nested" } }, "fallback")
    ).toBe("nested");
    expect(extractAuthApiErrorMessage({}, "Sign-in failed.")).toBe(
      "Sign-in failed."
    );
  });
});
