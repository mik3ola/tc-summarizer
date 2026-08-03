import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  DEFAULT_MAX_TEXT_CHARS,
  isCurrentSummaryRequest,
  resolveDynamicNavigationOutcome,
  resolveHoverLinkAction,
  getConfidenceTooltip,
  getConfidenceBadgeClass,
  truncateDisplayUrl,
  clampTextForSummarize,
  resolveSummarizeAuthGate,
} = require("../src/summary-flow-utils.js");

describe("isCurrentSummaryRequest", () => {
  it("accepts matching ids and rejects stale ones", () => {
    expect(isCurrentSummaryRequest(3, 3)).toBe(true);
    expect(isCurrentSummaryRequest(4, 3)).toBe(false);
    expect(isCurrentSummaryRequest(0, 1)).toBe(false);
  });
});

describe("resolveDynamicNavigationOutcome", () => {
  it("returns modal-element when DOM content was found", () => {
    const el = { id: "terms-modal" };
    expect(resolveDynamicNavigationOutcome(el)).toEqual({
      type: "modal-element",
      value: el,
    });
  });

  it("returns click-to-load when content is not yet in the DOM", () => {
    expect(resolveDynamicNavigationOutcome(null)).toEqual({
      type: "click-to-load",
      value: null,
    });
    expect(resolveDynamicNavigationOutcome(undefined)).toEqual({
      type: "click-to-load",
      value: null,
    });
  });
});

describe("resolveHoverLinkAction", () => {
  it("routes each linkInfo type to the correct startHover branch", () => {
    expect(resolveHoverLinkAction({ type: "modal", value: "#x" })).toEqual({
      action: "summarize_modal",
    });
    expect(resolveHoverLinkAction({ type: "modal-element", value: {} })).toEqual({
      action: "summarize_modal_element",
    });
    expect(resolveHoverLinkAction({ type: "click-to-load", value: {} })).toEqual({
      action: "click_to_load",
    });
    expect(resolveHoverLinkAction({ type: "url", value: "/terms" })).toEqual({
      action: "summarize_url",
    });
  });

  it("ignores missing or unknown link info", () => {
    expect(resolveHoverLinkAction(null)).toEqual({ action: "ignore" });
    expect(resolveHoverLinkAction({})).toEqual({ action: "ignore" });
    expect(resolveHoverLinkAction({ type: "dynamic" })).toEqual({ action: "ignore" });
  });
});

describe("confidence display", () => {
  it("returns known tooltips and defaults unknown to medium", () => {
    expect(getConfidenceTooltip("high")).toContain("High confidence");
    expect(getConfidenceTooltip("low")).toContain("Low confidence");
    expect(getConfidenceTooltip("medium")).toContain("Medium confidence");
    expect(getConfidenceTooltip("weird")).toBe(getConfidenceTooltip("medium"));
    expect(getConfidenceTooltip(undefined)).toBe(getConfidenceTooltip("medium"));
  });

  it("maps confidence to badge CSS classes", () => {
    expect(getConfidenceBadgeClass("high")).toBe("badge-high");
    expect(getConfidenceBadgeClass("low")).toBe("badge-low");
    expect(getConfidenceBadgeClass("medium")).toBe("badge-medium");
    expect(getConfidenceBadgeClass(null)).toBe("badge-medium");
  });
});

describe("truncateDisplayUrl", () => {
  it("leaves short URLs unchanged and ellipsizes long ones", () => {
    expect(truncateDisplayUrl("https://a.com/t")).toBe("https://a.com/t");
    expect(truncateDisplayUrl("https://example.com/terms", 20)).toBe(
      "https://example.c…"
    );
    const long = "abcdefghij".repeat(6); // 60
    expect(truncateDisplayUrl(long, 50)).toBe(long.slice(0, 47) + "…");
    expect(truncateDisplayUrl(null)).toBe("");
    expect(truncateDisplayUrl(undefined)).toBe("");
  });
});

describe("clampTextForSummarize", () => {
  it("returns empty for blank input", () => {
    expect(clampTextForSummarize("")).toBe("");
    expect(clampTextForSummarize("   ")).toBe("");
    expect(clampTextForSummarize(null)).toBe("");
  });

  it("clamps oversized text to the max char budget", () => {
    const big = "a".repeat(100);
    expect(clampTextForSummarize(big, 40).length).toBe(40);
    expect(clampTextForSummarize("hello world", 1000)).toBe("hello world");
  });

  it("defaults max to DEFAULT_MAX_TEXT_CHARS", () => {
    expect(DEFAULT_MAX_TEXT_CHARS).toBe(45_000);
    const big = "x".repeat(DEFAULT_MAX_TEXT_CHARS + 10);
    expect(clampTextForSummarize(big).length).toBe(DEFAULT_MAX_TEXT_CHARS);
  });
});

describe("resolveSummarizeAuthGate", () => {
  it("blocks guests and allows sessions with access tokens", () => {
    expect(resolveSummarizeAuthGate({})).toEqual({
      allowed: false,
      error: "Please sign in to use TermsDigest!",
    });
    expect(resolveSummarizeAuthGate({ hasAccessToken: true })).toEqual({
      allowed: true,
      error: null,
    });
  });
});
