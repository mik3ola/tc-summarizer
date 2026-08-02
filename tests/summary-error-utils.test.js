import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  isContextInvalidatedMessage,
  isProForErrorUi,
  hasUsableOpenAIKey,
  classifySummaryErrorUi,
} = require("../src/summary-error-utils.js");

describe("isContextInvalidatedMessage", () => {
  it("detects extension reload / port failures", () => {
    expect(isContextInvalidatedMessage("Extension context invalidated.")).toBe(true);
    expect(isContextInvalidatedMessage("message port closed")).toBe(true);
    expect(isContextInvalidatedMessage("Cannot read properties of undefined (reading 'get')")).toBe(
      true
    );
  });

  it("rejects unrelated errors", () => {
    expect(isContextInvalidatedMessage("Quota exceeded")).toBe(false);
    expect(isContextInvalidatedMessage("")).toBe(false);
    expect(isContextInvalidatedMessage(null)).toBe(false);
  });
});

describe("isProForErrorUi / hasUsableOpenAIKey", () => {
  it("treats plan===pro as Pro even without active status (UI-flexible)", () => {
    expect(isProForErrorUi("active", "pro")).toBe(true);
    expect(isProForErrorUi("canceled", "pro")).toBe(true);
    expect(isProForErrorUi(null, "pro")).toBe(true);
    expect(isProForErrorUi("active", "free")).toBe(false);
    expect(isProForErrorUi(null, null)).toBe(false);
  });

  it("requires a non-empty trimmed API key", () => {
    expect(hasUsableOpenAIKey("sk-test")).toBe(true);
    expect(hasUsableOpenAIKey("  sk-test  ")).toBe(true);
    expect(hasUsableOpenAIKey("")).toBe(false);
    expect(hasUsableOpenAIKey("   ")).toBe(false);
    expect(hasUsableOpenAIKey(null)).toBe(false);
  });
});

describe("classifySummaryErrorUi", () => {
  it("maps unreadable pages to a soft info notice", () => {
    const a = classifySummaryErrorUi({ errMsg: "UNREADABLE_PAGE" });
    expect(a.buttonSet).toBe("info");
    expect(a.isInfoNotice).toBe(true);
    expect(a.headerTitle).toBe("Nothing to summarise");
    expect(a.displayMsg).toContain("couldn't read this page");

    const b = classifySummaryErrorUi({
      errMsg: "Could not extract readable text from page",
    });
    expect(b.buttonSet).toBe("info");
  });

  it("asks for a page refresh on context invalidation", () => {
    const r = classifySummaryErrorUi({
      errMsg: "Extension context invalidated.",
    });
    expect(r.buttonSet).toBe("refresh");
    expect(r.showRefreshButton).toBe(true);
    expect(r.displayMsg).toContain("page refresh");
  });

  it("routes login / API access failures to sign-in", () => {
    for (const errMsg of ["No API access", "Please login", "Please sign in again"]) {
      const r = classifySummaryErrorUi({ errMsg });
      expect(r.buttonSet).toBe("sign_in");
      expect(r.isSignInIssue).toBe(true);
      expect(r.displayMsg).toBe("Please sign in to continue");
    }
  });

  it("shows upgrade CTA for Free quota, add-key for Pro, suppress for Pro+key", () => {
    const free = classifySummaryErrorUi({
      errMsg: "Quota exceeded",
      isProUser: false,
      hasOpenAIKey: false,
    });
    expect(free.buttonSet).toBe("upgrade");
    expect(free.showUpgradeButton).toBe(true);
    expect(free.displayMsg).toBe("You've hit your usage limit");

    const proNoKey = classifySummaryErrorUi({
      errMsg: "quotaExceeded",
      isProUser: true,
      hasOpenAIKey: false,
    });
    expect(proNoKey.buttonSet).toBe("pro_quota");
    expect(proNoKey.isProQuotaExceeded).toBe(true);
    expect(proNoKey.displayMsg).toContain("Add your OpenAI API key");

    const proKey = classifySummaryErrorUi({
      errMsg: "Quota exceeded",
      isProUser: true,
      hasOpenAIKey: true,
    });
    expect(proKey.suppress).toBe(true);
    expect(proKey.buttonSet).toBe("suppress");
  });

  it("maps JWT/401 session failures to sign-in", () => {
    for (const errMsg of ["Session expired", "Invalid JWT", "401 Unauthorized", "Unauthorized"]) {
      const r = classifySummaryErrorUi({ errMsg });
      expect(r.buttonSet).toBe("sign_in");
      expect(r.displayMsg).toBe("Session expired");
      expect(r.headerTitle).toBe("Sign in required");
    }
  });

  it("defaults unknown errors to generic options + view page", () => {
    const r = classifySummaryErrorUi({ errMsg: "Something exploded" });
    expect(r.buttonSet).toBe("generic");
    expect(r.displayMsg).toBe("Something exploded");
    expect(r.suppress).toBe(false);
  });
});
