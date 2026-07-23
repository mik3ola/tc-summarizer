import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  getTypeSpecificSelectors,
  normalizeModalIdBase,
  buildIdBasedModalSelectors,
  visibleModalMatchesContentType,
  scoreElementForContentType,
  isSubstantialText,
  hasKeywordRichText,
  getGenericLegalSelectors
} = require("../src/modal-discovery-utils.js");

describe("getTypeSpecificSelectors", () => {
  it("returns privacy/terms/cookie/security selector sets", () => {
    expect(getTypeSpecificSelectors("privacy")).toContain(".privacy-policy");
    expect(getTypeSpecificSelectors("privacy")).toContain('[id*="privacy"]');
    expect(getTypeSpecificSelectors("terms")).toContain(".terms-of-service");
    expect(getTypeSpecificSelectors("terms")).toContain('[class*="conditions"]');
    expect(getTypeSpecificSelectors("cookie")).toContain(".cookie-policy");
    expect(getTypeSpecificSelectors("security")).toContain(".security-policy");
  });

  it("returns empty for refund/legal/unknown (no dedicated selector family)", () => {
    expect(getTypeSpecificSelectors("refund")).toEqual([]);
    expect(getTypeSpecificSelectors("legal")).toEqual([]);
    expect(getTypeSpecificSelectors("other")).toEqual([]);
  });
});

describe("normalizeModalIdBase + buildIdBasedModalSelectors", () => {
  it("strips link/button/footer/welcome-overlay affixes", () => {
    expect(normalizeModalIdBase("privacy-policy-link")).toBe("privacy-policy");
    expect(normalizeModalIdBase("terms-button")).toBe("terms");
    expect(normalizeModalIdBase("footer-terms")).toBe("terms");
    expect(normalizeModalIdBase("welcome-overlay-privacy")).toBe("privacy");
    expect(normalizeModalIdBase("")).toBe("");
  });

  it("builds modal/overlay/dialog/content id and class candidates", () => {
    expect(buildIdBasedModalSelectors("privacy-policy")).toEqual([
      "#privacy-policy-modal",
      "#privacy-policy-overlay",
      "#privacy-policy-dialog",
      "#privacy-policy-content",
      "#privacy-policy",
      ".privacy-policy",
      '[class*="privacy-policy"]',
      "section.privacy-policy"
    ]);
    expect(buildIdBasedModalSelectors("")).toEqual([]);
  });
});

describe("visibleModalMatchesContentType", () => {
  it("matches privacy/terms via text, class, or id", () => {
    expect(
      visibleModalMatchesContentType("privacy", {
        text: "Our Privacy Policy",
        className: "",
        id: ""
      })
    ).toBe(true);
    expect(
      visibleModalMatchesContentType("privacy", {
        text: "hello",
        className: "modal privacy-box",
        id: ""
      })
    ).toBe(true);
    expect(
      visibleModalMatchesContentType("terms", { text: "", className: "", id: "terms-modal" })
    ).toBe(true);
  });

  it("does not match unrelated or unsupported types", () => {
    expect(
      visibleModalMatchesContentType("privacy", {
        text: "Terms of Service",
        className: "terms",
        id: "terms"
      })
    ).toBe(false);
    expect(
      visibleModalMatchesContentType("cookie", {
        text: "cookie policy",
        className: "cookie",
        id: "cookie"
      })
    ).toBe(false);
  });
});

describe("scoreElementForContentType", () => {
  it("scores class/id hits higher than phrase hits", () => {
    expect(
      scoreElementForContentType("privacy", {
        text: "x",
        className: "privacy-content",
        id: ""
      })
    ).toBe(10);
    expect(
      scoreElementForContentType("privacy", {
        text: "read our privacy policy carefully",
        className: "",
        id: ""
      })
    ).toBe(5);
    expect(
      scoreElementForContentType("privacy", {
        text: "privacy policy",
        className: "privacy",
        id: ""
      })
    ).toBe(15);
  });

  it("scores terms similarly and returns 0 for non-matches", () => {
    expect(
      scoreElementForContentType("terms", {
        text: "terms and conditions apply",
        className: "",
        id: "terms"
      })
    ).toBe(15);
    expect(
      scoreElementForContentType("terms", { text: "hello", className: "box", id: "x" })
    ).toBe(0);
    expect(
      scoreElementForContentType("cookie", {
        text: "cookie policy",
        className: "cookie",
        id: "cookie"
      })
    ).toBe(0);
  });
});

describe("isSubstantialText / hasKeywordRichText / generic selectors", () => {
  it("requires trimmed length greater than threshold", () => {
    expect(isSubstantialText("a".repeat(101), 100)).toBe(true);
    expect(isSubstantialText("a".repeat(100), 100)).toBe(false);
    expect(isSubstantialText("  abc  ", 3)).toBe(false);
    expect(isSubstantialText("  abcd  ", 3)).toBe(true);
  });

  it("gates keyword-rich modal/iframe text", () => {
    const keywords = ["privacy", "terms"];
    expect(hasKeywordRichText("x".repeat(250) + " privacy policy", keywords, 200)).toBe(true);
    expect(hasKeywordRichText("short privacy", keywords, 200)).toBe(false);
    expect(hasKeywordRichText("x".repeat(250) + " hello", keywords, 200)).toBe(false);
    expect(hasKeywordRichText("x".repeat(250) + " TERMS", keywords, 200)).toBe(true);
  });

  it("exposes generic legal fallback selectors", () => {
    expect(getGenericLegalSelectors()).toContain(".legal-content");
    expect(getGenericLegalSelectors()).toContain('div[class*="legal"]');
  });
});
