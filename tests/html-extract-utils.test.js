import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  canInjectPageUi,
  toAbsoluteUrl,
  resolveElementNavigation,
  cleanExtractedText,
  collectContentCandidates,
  pickBestCandidateText,
  extractTextFromHtml,
} = require("../src/html-extract-utils.js");

describe("canInjectPageUi", () => {
  class FakeHTMLElement {}
  class FakeSVGElement {}

  it("allows normal HTML documents", () => {
    const doc = {
      body: {},
      documentElement: new FakeHTMLElement(),
    };
    expect(canInjectPageUi(doc, FakeHTMLElement)).toBe(true);
  });

  it("rejects SVG / missing-body documents (extension crash guard)", () => {
    expect(
      canInjectPageUi(
        { body: {}, documentElement: new FakeSVGElement() },
        FakeHTMLElement
      )
    ).toBe(false);
    expect(
      canInjectPageUi({ body: null, documentElement: new FakeHTMLElement() }, FakeHTMLElement)
    ).toBe(false);
    expect(canInjectPageUi(null, FakeHTMLElement)).toBe(false);
  });
});

describe("toAbsoluteUrl", () => {
  it("resolves relative URLs against the page base", () => {
    expect(toAbsoluteUrl("/privacy", "https://example.com/app/settings")).toBe(
      "https://example.com/privacy"
    );
    expect(
      toAbsoluteUrl("terms.html", "https://example.com/legal/")
    ).toBe("https://example.com/legal/terms.html");
  });

  it("returns null for invalid inputs", () => {
    expect(toAbsoluteUrl("https://exa mple.com", "https://example.com")).toBe(null);
  });
});

describe("resolveElementNavigation", () => {
  it("prefers real href / data-href URLs", () => {
    expect(
      resolveElementNavigation({ href: "https://example.com/terms" })
    ).toEqual({ type: "url", value: "https://example.com/terms" });
    expect(
      resolveElementNavigation({ dataHref: "/privacy-policy" })
    ).toEqual({ type: "url", value: "/privacy-policy" });
  });

  it("uses data-url / data-link when href is not a navigable URL", () => {
    expect(
      resolveElementNavigation({
        href: "#",
        dataUrl: "https://example.com/refund",
      })
    ).toEqual({ type: "url", value: "https://example.com/refund" });
    expect(
      resolveElementNavigation({
        href: "javascript:void(0)",
        dataLink: "/returns",
      })
    ).toEqual({ type: "url", value: "/returns" });
  });

  it("detects Bootstrap modal targets", () => {
    expect(
      resolveElementNavigation({
        href: "#",
        dataBsTarget: "#termsModal",
      })
    ).toEqual({ type: "modal", value: "#termsModal" });
    expect(
      resolveElementNavigation({ dataTarget: "#legacyModal" })
    ).toEqual({ type: "modal", value: "#legacyModal" });
  });

  it("marks javascript/empty/# anchors as dynamic for modal discovery", () => {
    expect(resolveElementNavigation({ href: "javascript:void(0)" })).toEqual({
      type: "dynamic",
      value: null,
    });
    expect(resolveElementNavigation({ href: "#" })).toEqual({
      type: "dynamic",
      value: null,
    });
    expect(resolveElementNavigation({})).toEqual({
      type: "dynamic",
      value: null,
    });
  });
});

describe("cleanExtractedText / candidate picking", () => {
  it("normalizes nbsp, whitespace, and excess blank lines", () => {
    expect(cleanExtractedText("  hello\u00a0\u00a0world  \n\n\n\nnext  ")).toBe(
      "hello world\n\nnext"
    );
  });

  it("picks the longest cleaned candidate", () => {
    const best = pickBestCandidateText([
      { textContent: "short" },
      { textContent: "This is the main legal document body with more text." },
      { textContent: "medium length text" },
    ]);
    expect(best).toContain("main legal document");
  });

  it("collects known content selectors from a fake document", () => {
    const main = { textContent: "main" };
    const body = { textContent: "body" };
    const doc = {
      body,
      querySelector(sel) {
        if (sel === "main") return main;
        if (sel === "article") return { textContent: "article" };
        return null;
      },
    };
    const candidates = collectContentCandidates(doc);
    expect(candidates).toContain(main);
    expect(candidates).toContain(body);
    expect(candidates.some((c) => c.textContent === "article")).toBe(true);
  });
});

describe("extractTextFromHtml", () => {
  it("returns empty string for missing HTML or missing parser", () => {
    expect(extractTextFromHtml("")).toBe("");
    expect(extractTextFromHtml(null)).toBe("");
    expect(extractTextFromHtml("<html></html>", null)).toBe("");
  });

  it("prefers main/article text and strips script/style via injected parser", () => {
    const removed = [];
    const main = { textContent: "Terms of Service body copy that is substantial." };
    const body = {
      textContent: "nav footer noise",
    };
    const doc = {
      body,
      querySelector(sel) {
        if (sel === "main") return main;
        return null;
      },
      querySelectorAll(sel) {
        if (sel === "script, style, noscript, svg, canvas") {
          return [
            {
              remove() {
                removed.push("script");
              },
            },
          ];
        }
        return [];
      },
    };

    const text = extractTextFromHtml("<html></html>", () => doc);
    expect(removed).toEqual(["script"]);
    expect(text).toBe("Terms of Service body copy that is substantial.");
  });
});
