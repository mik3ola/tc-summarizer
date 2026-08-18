import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  SIGN_IN_REQUIRED_ERROR,
  resolveBackgroundMessageIntent,
  resolveSummarizeLoginGate,
} = require("../src/background-message-utils.js");

describe("resolveBackgroundMessageIntent", () => {
  it("ignores non-object messages", () => {
    expect(resolveBackgroundMessageIntent(null)).toEqual({ intent: "ignore" });
    expect(resolveBackgroundMessageIntent(undefined)).toEqual({
      intent: "ignore",
    });
    expect(resolveBackgroundMessageIntent("open_options")).toEqual({
      intent: "ignore",
    });
  });

  it("routes known open-options intents", () => {
    expect(resolveBackgroundMessageIntent({ type: "open_options" })).toEqual({
      intent: "open_options",
    });
    expect(
      resolveBackgroundMessageIntent({ type: "open_options_upgrade" })
    ).toEqual({ intent: "open_options_upgrade" });
  });

  it("routes fetch_html and get_preferences with payload fields", () => {
    expect(
      resolveBackgroundMessageIntent({
        type: "fetch_html",
        url: "https://example.com/terms#hash",
      })
    ).toEqual({
      intent: "fetch_html",
      url: "https://example.com/terms#hash",
    });
    expect(
      resolveBackgroundMessageIntent({ type: "get_preferences" })
    ).toEqual({ intent: "get_preferences" });
  });

  it("routes summarize_text with url and text", () => {
    expect(
      resolveBackgroundMessageIntent({
        type: "summarize_text",
        url: "https://example.com/privacy",
        text: "policy body",
      })
    ).toEqual({
      intent: "summarize_text",
      url: "https://example.com/privacy",
      text: "policy body",
    });
  });

  it("marks unknown types without throwing", () => {
    expect(
      resolveBackgroundMessageIntent({ type: "auth_callback", token: "x" })
    ).toEqual({ intent: "unknown", type: "auth_callback" });
    expect(resolveBackgroundMessageIntent({})).toEqual({
      intent: "unknown",
      type: undefined,
    });
  });
});

describe("resolveSummarizeLoginGate", () => {
  it("allows summarize when access_token is present", () => {
    expect(
      resolveSummarizeLoginGate({ accessToken: "eyJhbGciOi..." })
    ).toEqual({ ok: true });
  });

  it("rejects guests with the historical sign-in error string", () => {
    expect(resolveSummarizeLoginGate({})).toEqual({
      ok: false,
      error: SIGN_IN_REQUIRED_ERROR,
    });
    expect(resolveSummarizeLoginGate({ accessToken: "" })).toEqual({
      ok: false,
      error: "Please sign in to use TermsDigest!",
    });
    expect(resolveSummarizeLoginGate({ accessToken: null })).toEqual({
      ok: false,
      error: SIGN_IN_REQUIRED_ERROR,
    });
  });
});
