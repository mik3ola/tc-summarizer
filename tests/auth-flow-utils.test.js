import { describe, it, expect } from "vitest";
import {
  resolveConfirmBootstrap,
  resolveConfirmVerifyResult,
  parseRecoveryHash,
  validateNewPassword,
} from "../website/src/lib/auth-flow-utils.ts";

describe("resolveConfirmBootstrap", () => {
  it("requests verify when token_hash is present (default type signup)", () => {
    expect(
      resolveConfirmBootstrap({ search: "?token_hash=abc123", hash: "" })
    ).toEqual({
      action: "verify",
      tokenHash: "abc123",
      type: "signup",
    });
  });

  it("preserves explicit type query param", () => {
    expect(
      resolveConfirmBootstrap({
        search: "token_hash=tok&type=email_change",
        hash: "",
      })
    ).toEqual({
      action: "verify",
      tokenHash: "tok",
      type: "email_change",
    });
  });

  it("treats hash access_token as already-successful implicit confirm", () => {
    expect(
      resolveConfirmBootstrap({
        search: "",
        hash: "#access_token=xyz&type=signup",
      })
    ).toEqual({ action: "success" });
  });

  it("errors when neither token_hash nor hash access_token is present", () => {
    expect(resolveConfirmBootstrap({ search: "", hash: "" })).toEqual({
      action: "error",
      errorMessage:
        "No confirmation token found. Please use the link from your email.",
    });
    expect(
      resolveConfirmBootstrap({ search: "?type=signup", hash: "#foo=1" })
    ).toMatchObject({ action: "error" });
  });
});

describe("resolveConfirmVerifyResult", () => {
  it("returns success for empty / non-error bodies", () => {
    expect(resolveConfirmVerifyResult({})).toEqual({ status: "success" });
    expect(resolveConfirmVerifyResult({ access_token: "x" })).toEqual({
      status: "success",
    });
    expect(resolveConfirmVerifyResult(null)).toEqual({ status: "success" });
  });

  it("maps the specific expired-link error to already_confirmed", () => {
    expect(
      resolveConfirmVerifyResult({
        error: "Email link is invalid or has expired",
      })
    ).toEqual({ status: "already_confirmed" });
  });

  it("maps other errors with description fallback", () => {
    expect(
      resolveConfirmVerifyResult({
        error: "bad",
        error_description: "Nope",
      })
    ).toEqual({ status: "error", errorMessage: "Nope" });
    expect(resolveConfirmVerifyResult({ error: "only-error" })).toEqual({
      status: "error",
      errorMessage: "only-error",
    });
  });
});

describe("parseRecoveryHash", () => {
  it("accepts recovery hashes with access_token", () => {
    expect(
      parseRecoveryHash("#access_token=recov-tok&type=recovery&expires_in=3600")
    ).toEqual({ valid: true, accessToken: "recov-tok" });
  });

  it("rejects missing token, wrong type, or empty hash", () => {
    expect(parseRecoveryHash("#type=recovery")).toEqual({ valid: false });
    expect(parseRecoveryHash("#access_token=x&type=signup")).toEqual({
      valid: false,
    });
    expect(parseRecoveryHash("")).toEqual({ valid: false });
    expect(parseRecoveryHash(null)).toEqual({ valid: false });
  });
});

describe("validateNewPassword", () => {
  it("requires at least 8 characters", () => {
    expect(validateNewPassword({ password: "short", confirm: "short" })).toEqual({
      ok: false,
      errorMsg: "Password must be at least 8 characters.",
    });
  });

  it("requires matching confirmation", () => {
    expect(
      validateNewPassword({ password: "longenough", confirm: "different1" })
    ).toEqual({ ok: false, errorMsg: "Passwords do not match." });
  });

  it("accepts matching passwords of sufficient length", () => {
    expect(
      validateNewPassword({ password: "longenough", confirm: "longenough" })
    ).toEqual({ ok: true });
  });
});
