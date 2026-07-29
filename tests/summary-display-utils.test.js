import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  getDisplayQuotaForPlan,
  parseHoverDelayMs,
  estimateMinutesSaved,
  resolveSummaryCacheKey,
  formatSummaryClipboardText,
} = require("../src/summary-display-utils.js");

describe("getDisplayQuotaForPlan", () => {
  it("maps Free / Pro / Enterprise tiers", () => {
    expect(getDisplayQuotaForPlan("free")).toBe(5);
    expect(getDisplayQuotaForPlan(undefined)).toBe(5);
    expect(getDisplayQuotaForPlan("pro")).toBe(50);
    expect(getDisplayQuotaForPlan("enterprise")).toBe(5000);
  });
});

describe("parseHoverDelayMs", () => {
  it("parses positive numeric delays", () => {
    expect(parseHoverDelayMs(750)).toBe(750);
    expect(parseHoverDelayMs("1000")).toBe(1000);
  });

  it("falls back for missing, zero, or invalid values", () => {
    expect(parseHoverDelayMs(undefined)).toBe(750);
    expect(parseHoverDelayMs(null)).toBe(750);
    expect(parseHoverDelayMs("")).toBe(750);
    expect(parseHoverDelayMs(0)).toBe(750);
    expect(parseHoverDelayMs("nope")).toBe(750);
    expect(parseHoverDelayMs(-5, 500)).toBe(500);
  });
});

describe("estimateMinutesSaved", () => {
  it("uses ~5 chars/word and 200 wpm", () => {
    // 2000 chars => 400 words => 2 minutes
    expect(estimateMinutesSaved(2000)).toBe(2);
    expect(estimateMinutesSaved(999)).toBe(0);
    expect(estimateMinutesSaved(0)).toBe(0);
    expect(estimateMinutesSaved(null)).toBe(0);
  });
});

describe("resolveSummaryCacheKey", () => {
  it("prefers exact normalized keys", () => {
    const cache = {
      "summary:example.com/terms": { originalTextLength: 1000 },
    };
    expect(
      resolveSummaryCacheKey(cache, "https://example.com/terms/")
    ).toBe("summary:example.com/terms");
  });

  it("matches fuzzy legacy keys including hash variants", () => {
    const cache = {
      "summary:https://example.com/terms#section": { originalTextLength: 500 },
      other: { originalTextLength: 1 },
    };
    expect(
      resolveSummaryCacheKey(cache, "https://example.com/terms")
    ).toBe("summary:https://example.com/terms#section");
  });

  it("returns null when cache or url is missing", () => {
    expect(resolveSummaryCacheKey(null, "https://x.com")).toBe(null);
    expect(resolveSummaryCacheKey({}, "")).toBe(null);
    expect(resolveSummaryCacheKey({ "summary:a.com": {} }, "https://b.com")).toBe(
      null
    );
  });
});

describe("formatSummaryClipboardText", () => {
  const summary = {
    title: "Acme Terms",
    tldr: "Short overview.",
    costs_and_renewal: ["$10/mo"],
    cancellation_and_refunds: ["Cancel anytime"],
    liability_and_disputes: ["Cap at fees"],
    privacy_and_data: ["Sold to partners"],
    red_flags: ["Auto-renew trap"],
    quotes: [
      { quote: "Q1", why_it_matters: "matter1" },
      { quote: "Q2" },
      { quote: "Q3", why_it_matters: "matter3" },
      { quote: "Q4" },
      { quote: "", why_it_matters: "ignored" },
    ],
  };

  it("includes sections, caps quotes at 3, and appends source", () => {
    const text = formatSummaryClipboardText({
      summary,
      sourceUrl: "https://example.com/terms",
      showRedFlags: true,
      showQuotes: true,
    });
    expect(text).toContain("Acme Terms");
    expect(text).toContain("Quick Summary");
    expect(text).toContain("Short overview.");
    expect(text).toContain("Costs & renewal");
    expect(text).toContain("• $10/mo");
    expect(text).toContain("Red flags");
    expect(text).toContain("Supporting quotes");
    expect(text).toContain('"Q1" — matter1');
    expect(text).toContain('"Q2"');
    expect(text).toContain('"Q3" — matter3');
    expect(text).not.toContain('"Q4"');
    expect(text).toContain("Source: https://example.com/terms");
  });

  it("omits red flags and quotes when preferences disable them", () => {
    const text = formatSummaryClipboardText({
      summary,
      showRedFlags: false,
      showQuotes: false,
    });
    expect(text).not.toContain("Red flags");
    expect(text).not.toContain("Supporting quotes");
    expect(text).not.toContain('"Q1"');
    expect(text).toContain("Costs & renewal");
  });

  it("returns empty string for missing summary", () => {
    expect(formatSummaryClipboardText({})).toBe("");
    expect(formatSummaryClipboardText({ summary: null })).toBe("");
  });
});
