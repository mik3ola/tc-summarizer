import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  DEFAULT_MIN_MODAL_TEXT_CHARS,
  normalizeAnchorTextForCacheKey,
  buildInlineSummaryCacheKey,
  isSummarizableExtractedText,
} = require("../src/inline-cache-utils.js");

describe("normalizeAnchorTextForCacheKey", () => {
  it("trims, lowercases, collapses whitespace, and caps at 50 chars", () => {
    expect(normalizeAnchorTextForCacheKey("  Terms   of   Service  ")).toBe(
      "terms-of-service"
    );
    const long = "Privacy Policy " + "x".repeat(80);
    expect(normalizeAnchorTextForCacheKey(long).length).toBe(50);
  });

  it("handles empty/null", () => {
    expect(normalizeAnchorTextForCacheKey("")).toBe("");
    expect(normalizeAnchorTextForCacheKey(null)).toBe("");
  });
});

describe("buildInlineSummaryCacheKey", () => {
  it("prefers stable anchor id over visible text", () => {
    expect(
      buildInlineSummaryCacheKey({
        displayUrl: "https://example.com/checkout",
        anchorId: "tos-btn",
        anchorText: "Terms of Service",
      })
    ).toBe("https://example.com/checkout#link:tos-btn");
  });

  it("falls back to normalized anchor text when id is missing", () => {
    expect(
      buildInlineSummaryCacheKey({
        displayUrl: "https://example.com/app",
        anchorId: "",
        anchorText: "Refund Policy",
      })
    ).toBe("https://example.com/app#link:refund-policy");
  });

  it("keeps distinct keys for different controls on the same page", () => {
    const a = buildInlineSummaryCacheKey({
      displayUrl: "https://shop.example/buy",
      anchorText: "Terms",
    });
    const b = buildInlineSummaryCacheKey({
      displayUrl: "https://shop.example/buy",
      anchorText: "Privacy",
    });
    expect(a).not.toBe(b);
  });
});

describe("isSummarizableExtractedText", () => {
  it("requires the default minimum length after whitespace collapse", () => {
    expect(DEFAULT_MIN_MODAL_TEXT_CHARS).toBe(50);
    expect(isSummarizableExtractedText("short")).toBe(false);
    expect(isSummarizableExtractedText("a".repeat(49))).toBe(false);
    expect(isSummarizableExtractedText("a".repeat(50))).toBe(true);
    expect(isSummarizableExtractedText("  " + "word ".repeat(20))).toBe(true);
  });

  it("rejects empty / whitespace-only extracts", () => {
    expect(isSummarizableExtractedText("")).toBe(false);
    expect(isSummarizableExtractedText("   \n\t  ")).toBe(false);
    expect(isSummarizableExtractedText(null)).toBe(false);
  });
});
