import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  normalizeText,
  isLegalUrlPath,
  visibleTextLooksLegal,
  isLikelyLegalLinkSignals,
  normalizePrefsPatch,
  prefersTouchSummarize
} = require("../src/legal-link-utils.js");

const ORIGIN = "https://shop.example.com";

describe("normalizeText", () => {
  it("lowercases and collapses whitespace", () => {
    expect(normalizeText("  Terms   Of   Service  ")).toBe("terms of service");
  });

  it("expands compound legal phrases", () => {
    expect(normalizeText("TermsAndConditions")).toBe("terms and conditions");
    expect(normalizeText("PrivacyStatement")).toBe("privacy statement");
    expect(normalizeText("PrivacyPolicy")).toBe("privacy policy");
    expect(normalizeText("CookiePolicy")).toBe("cookie policy");
  });

  it("decodes &amp; entities", () => {
    expect(normalizeText("Terms &amp; Conditions")).toBe("terms & conditions");
  });

  it("handles nullish input", () => {
    expect(normalizeText(null)).toBe("");
    expect(normalizeText(undefined)).toBe("");
  });
});

describe("isLegalUrlPath", () => {
  it("accepts dedicated legal path segments near the end", () => {
    expect(isLegalUrlPath("/terms", ORIGIN)).toBe(true);
    expect(isLegalUrlPath("/privacy-policy", ORIGIN)).toBe(true);
    expect(isLegalUrlPath("/help/legal/terms-of-service", ORIGIN)).toBe(true);
    expect(isLegalUrlPath("https://shop.example.com/legal/refund-policy", ORIGIN)).toBe(true);
    expect(isLegalUrlPath("/cookies", ORIGIN)).toBe(true);
    expect(isLegalUrlPath("/return-policy/", ORIGIN)).toBe(true);
  });

  it("rejects query-string-only or noisy retail paths (stricter matching regression)", () => {
    expect(isLegalUrlPath("/womens/?return_policy=true", ORIGIN)).toBe(false);
    expect(isLegalUrlPath("/search?q=terms", ORIGIN)).toBe(false);
    expect(isLegalUrlPath("/terms/dresses/sale", ORIGIN)).toBe(false);
    expect(isLegalUrlPath("/products/return-label-kit", ORIGIN)).toBe(false);
  });

  it("rejects non-resolvable and empty hrefs", () => {
    expect(isLegalUrlPath("", ORIGIN)).toBe(false);
    expect(isLegalUrlPath("javascript:void(0)", ORIGIN)).toBe(false);
    expect(isLegalUrlPath("#", ORIGIN)).toBe(false);
    expect(isLegalUrlPath("/", ORIGIN)).toBe(false);
  });
});

describe("visibleTextLooksLegal", () => {
  it("matches standalone legal keywords", () => {
    expect(visibleTextLooksLegal("privacy policy")).toBe(true);
    expect(visibleTextLooksLegal("terms & conditions")).toBe(true);
  });

  it("requires qualifiers for ambiguous words", () => {
    expect(visibleTextLooksLegal("subscriptions")).toBe(false);
    expect(visibleTextLooksLegal("subscription terms")).toBe(true);
    expect(visibleTextLooksLegal("cookies")).toBe(false);
    expect(visibleTextLooksLegal("cookie policy")).toBe(true);
  });

  it("strips termsdigest branding to avoid self-matches", () => {
    expect(visibleTextLooksLegal("termsdigest")).toBe(false);
  });
});

describe("isLikelyLegalLinkSignals", () => {
  it("matches visible legal link text", () => {
    expect(
      isLikelyLegalLinkSignals({
        tagName: "A",
        href: "/about",
        text: "Privacy Policy",
        baseOrigin: ORIGIN
      })
    ).toBe(true);
  });

  it("falls back to strict URL matching when text is empty", () => {
    expect(
      isLikelyLegalLinkSignals({
        tagName: "A",
        href: "/legal/privacy-policy",
        text: "",
        baseOrigin: ORIGIN
      })
    ).toBe(true);
  });

  it("rejects bare # anchors and non-interactive nodes", () => {
    expect(
      isLikelyLegalLinkSignals({
        tagName: "A",
        href: "#",
        text: "Privacy Policy",
        baseOrigin: ORIGIN
      })
    ).toBe(false);
    expect(
      isLikelyLegalLinkSignals({
        tagName: "SPAN",
        text: "Privacy Policy",
        baseOrigin: ORIGIN
      })
    ).toBe(false);
  });

  it("skips code-like contexts", () => {
    expect(
      isLikelyLegalLinkSignals({
        tagName: "A",
        href: "/terms",
        text: "terms",
        isInsideCode: true,
        baseOrigin: ORIGIN
      })
    ).toBe(false);
    expect(
      isLikelyLegalLinkSignals({
        tagName: "A",
        href: "/terms",
        text: "terms",
        className: "hljs-string",
        baseOrigin: ORIGIN
      })
    ).toBe(false);
  });

  it("rejects overlong text labels", () => {
    expect(
      isLikelyLegalLinkSignals({
        tagName: "A",
        href: "/terms",
        text: "terms " + "x".repeat(100),
        baseOrigin: ORIGIN
      })
    ).toBe(false);
  });
});

describe("normalizePrefsPatch", () => {
  it("coerces string booleans from storage", () => {
    expect(
      normalizePrefsPatch({
        autoHover: "true",
        showRedFlags: "false",
        showQuotes: true,
        enableCaching: false,
        hoverDelay: 500
      })
    ).toEqual({
      autoHover: true,
      showRedFlags: false,
      showQuotes: true,
      enableCaching: false,
      hoverDelay: 500
    });
  });

  it("returns empty object for invalid patches", () => {
    expect(normalizePrefsPatch(null)).toEqual({});
    expect(normalizePrefsPatch(undefined)).toEqual({});
    expect(normalizePrefsPatch("nope")).toEqual({});
  });
});

describe("prefersTouchSummarize", () => {
  it("detects coarse pointers and iOS user agents", () => {
    expect(
      prefersTouchSummarize({
        matchMedia: () => ({ matches: true }),
        userAgent: "Mozilla/5.0",
        maxTouchPoints: 0
      })
    ).toBe(true);
    expect(
      prefersTouchSummarize({
        matchMedia: () => ({ matches: false }),
        userAgent: "iPhone",
        maxTouchPoints: 0
      })
    ).toBe(true);
  });

  it("detects iPadOS desktop UA with touch points", () => {
    expect(
      prefersTouchSummarize({
        matchMedia: () => ({ matches: false }),
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        maxTouchPoints: 5
      })
    ).toBe(true);
  });

  it("returns false for desktop mouse pointers", () => {
    expect(
      prefersTouchSummarize({
        matchMedia: () => ({ matches: false }),
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        maxTouchPoints: 0
      })
    ).toBe(false);
  });
});
