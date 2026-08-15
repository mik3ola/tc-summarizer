import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  DEFAULT_SUMMARY_TITLE,
  DEFAULT_CONFIDENCE,
  resolveSummaryTitle,
  resolveConfidenceBadgeText,
} = require("../src/summary-header-utils.js");

describe("resolveSummaryTitle", () => {
  it("returns trimmed title when present", () => {
    expect(resolveSummaryTitle({ title: "  Terms of Service  " })).toBe(
      "Terms of Service"
    );
  });

  it("falls back for missing, non-string, or whitespace-only titles", () => {
    expect(resolveSummaryTitle(null)).toBe(DEFAULT_SUMMARY_TITLE);
    expect(resolveSummaryTitle({})).toBe(DEFAULT_SUMMARY_TITLE);
    expect(resolveSummaryTitle({ title: "" })).toBe(DEFAULT_SUMMARY_TITLE);
    expect(resolveSummaryTitle({ title: "   " })).toBe(DEFAULT_SUMMARY_TITLE);
    expect(resolveSummaryTitle({ title: 42 })).toBe(DEFAULT_SUMMARY_TITLE);
    expect(DEFAULT_SUMMARY_TITLE).toBe("Summary");
  });
});

describe("resolveConfidenceBadgeText", () => {
  it("defaults missing confidence to medium", () => {
    expect(resolveConfidenceBadgeText(undefined, false)).toBe(DEFAULT_CONFIDENCE);
    expect(resolveConfidenceBadgeText("", false)).toBe("medium");
    expect(resolveConfidenceBadgeText("   ", false)).toBe("medium");
    expect(DEFAULT_CONFIDENCE).toBe("medium");
  });

  it("preserves known confidence levels without cache suffix", () => {
    expect(resolveConfidenceBadgeText("high", false)).toBe("high");
    expect(resolveConfidenceBadgeText("low")).toBe("low");
  });

  it("appends cached marker only when fromCache is true", () => {
    expect(resolveConfidenceBadgeText("high", true)).toBe("high • cached");
    expect(resolveConfidenceBadgeText(undefined, true)).toBe("medium • cached");
    expect(resolveConfidenceBadgeText("  low  ", true)).toBe("low • cached");
  });
});
