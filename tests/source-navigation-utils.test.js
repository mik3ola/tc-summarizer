import { describe, it, expect } from "vitest";
const {
  resolveOriginalHrefFromElement,
  resolveOpenOriginalLinkAction,
  resolveViewSourceAction,
} = require("../src/source-navigation-utils.js");

describe("resolveOriginalHrefFromElement", () => {
  const abs = (href) => `ABS:${href}`;

  it("prefers href, then data-href, and absolute-izes", () => {
    expect(
      resolveOriginalHrefFromElement(
        { getAttribute: (n) => (n === "href" ? "/terms" : null) },
        abs
      )
    ).toBe("ABS:/terms");

    expect(
      resolveOriginalHrefFromElement(
        {
          getAttribute: (n) => (n === "data-href" ? "https://ex.com/p" : ""),
        },
        abs
      )
    ).toBe("ABS:https://ex.com/p");
  });

  it("returns null for missing element, empty attrs, or bad absolutizer", () => {
    expect(resolveOriginalHrefFromElement(null, abs)).toBeNull();
    expect(
      resolveOriginalHrefFromElement(
        { getAttribute: () => "" },
        abs
      )
    ).toBeNull();
    expect(
      resolveOriginalHrefFromElement(
        { getAttribute: () => "/x" },
        null
      )
    ).toBeNull();
  });
});

describe("resolveOpenOriginalLinkAction (open-link)", () => {
  it("prefers live anchor click over href open", () => {
    expect(
      resolveOpenOriginalLinkAction({
        hasAnchor: true,
        originalHref: "https://ex.com/terms",
      })
    ).toEqual({ method: "click_anchor" });
  });

  it("falls back to window.open(originalHref) without an anchor", () => {
    expect(
      resolveOpenOriginalLinkAction({
        hasAnchor: false,
        originalHref: "https://ex.com/terms",
      })
    ).toEqual({ method: "open_href", href: "https://ex.com/terms" });
  });

  it("noops when neither anchor nor href is available", () => {
    expect(resolveOpenOriginalLinkAction({})).toEqual({ method: "noop" });
  });
});

describe("resolveViewSourceAction (view-source)", () => {
  it("re-clicks the modal trigger for in-page modal summaries", () => {
    expect(
      resolveViewSourceAction({
        isModalContent: true,
        hasAnchor: true,
        originalHref: "https://ex.com/terms",
      })
    ).toEqual({ method: "click_anchor" });
  });

  it("opens originalHref for URL-based summaries (not the cache key)", () => {
    expect(
      resolveViewSourceAction({
        isModalContent: false,
        hasAnchor: true,
        originalHref: "https://ex.com/terms",
      })
    ).toEqual({ method: "open_href", href: "https://ex.com/terms" });
  });

  it("falls back to anchor click when originalHref is missing", () => {
    expect(
      resolveViewSourceAction({
        isModalContent: false,
        hasAnchor: true,
        originalHref: null,
      })
    ).toEqual({ method: "click_anchor" });
  });

  it("noops with no anchor and no href", () => {
    expect(
      resolveViewSourceAction({
        isModalContent: true,
        hasAnchor: false,
        originalHref: null,
      })
    ).toEqual({ method: "noop" });
  });
});
