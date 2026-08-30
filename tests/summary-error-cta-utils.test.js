import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  resolveSummaryErrorCtas,
  buildSummaryErrorButtonsHtml,
  resolveButtonSetFromFlags,
} = require("../src/summary-error-cta-utils.js");

describe("resolveButtonSetFromFlags", () => {
  it("prioritizes suppress → refresh → pro_quota → upgrade → sign_in → info → generic", () => {
    expect(resolveButtonSetFromFlags({ suppress: true, showRefreshButton: true })).toBe(
      "suppress"
    );
    expect(resolveButtonSetFromFlags({ showRefreshButton: true, showUpgradeButton: true })).toBe(
      "refresh"
    );
    expect(resolveButtonSetFromFlags({ isProQuotaExceeded: true, showUpgradeButton: true })).toBe(
      "pro_quota"
    );
    expect(resolveButtonSetFromFlags({ showUpgradeButton: true, isSignInIssue: true })).toBe(
      "upgrade"
    );
    expect(resolveButtonSetFromFlags({ isSignInIssue: true, isInfoNotice: true })).toBe(
      "sign_in"
    );
    expect(resolveButtonSetFromFlags({ isInfoNotice: true })).toBe("info");
    expect(resolveButtonSetFromFlags({})).toBe("generic");
  });
});

describe("resolveSummaryErrorCtas", () => {
  it("suppress yields no CTAs", () => {
    expect(resolveSummaryErrorCtas("suppress")).toEqual([]);
  });

  it("refresh asks for page refresh + view page", () => {
    expect(resolveSummaryErrorCtas("refresh")).toEqual([
      { action: "refresh-page", label: "Refresh page", primary: false },
      { action: "open-link", label: "View page", primary: false },
    ]);
  });

  it("pro_quota primary CTA opens options for API key", () => {
    expect(resolveSummaryErrorCtas("pro_quota")).toEqual([
      { action: "open-options", label: "Add API Key", primary: true },
      { action: "open-support", label: "Contact Support", primary: false },
    ]);
  });

  it("upgrade primary CTA is upgrade-to-pro", () => {
    expect(resolveSummaryErrorCtas("upgrade")).toEqual([
      { action: "upgrade-to-pro", label: "Upgrade to Pro", primary: true },
      { action: "open-options", label: "Open Options", primary: false },
    ]);
  });

  it("sign_in routes to options with Sign in label", () => {
    expect(resolveSummaryErrorCtas("sign_in")).toEqual([
      { action: "open-options", label: "Sign in", primary: false },
      { action: "open-link", label: "View page", primary: false },
    ]);
  });

  it("info notice only offers view page", () => {
    expect(resolveSummaryErrorCtas("info")).toEqual([
      { action: "open-link", label: "View page", primary: false },
    ]);
  });

  it("generic / unknown fall back to options + view page", () => {
    expect(resolveSummaryErrorCtas("generic")).toEqual([
      { action: "open-options", label: "Open Options", primary: false },
      { action: "open-link", label: "View page", primary: false },
    ]);
    expect(resolveSummaryErrorCtas("not-a-real-set")).toEqual(
      resolveSummaryErrorCtas("generic")
    );
    expect(resolveSummaryErrorCtas(null)).toEqual(resolveSummaryErrorCtas("generic"));
  });
});

describe("buildSummaryErrorButtonsHtml", () => {
  it("renders primary class only when flagged", () => {
    const html = buildSummaryErrorButtonsHtml(resolveSummaryErrorCtas("upgrade"));
    expect(html).toContain('class="primary" data-action="upgrade-to-pro"');
    expect(html).toContain(">Upgrade to Pro</button>");
    expect(html).toContain('data-action="open-options">Open Options</button>');
    expect(html.match(/class="primary"/g)?.length).toBe(1);
  });

  it("returns empty string for suppress / empty lists", () => {
    expect(buildSummaryErrorButtonsHtml([])).toBe("");
    expect(buildSummaryErrorButtonsHtml(resolveSummaryErrorCtas("suppress"))).toBe("");
    expect(buildSummaryErrorButtonsHtml(null)).toBe("");
  });
});
