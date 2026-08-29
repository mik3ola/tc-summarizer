import { describe, it, expect, vi } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  LEGAL_INTERACTIVE_SELECTOR,
  findLegalInteractiveFromTarget,
  classifyElementNavigation,
} = require("../src/element-navigation-utils.js");

describe("LEGAL_INTERACTIVE_SELECTOR", () => {
  it("locks the historical closest() selector", () => {
    expect(LEGAL_INTERACTIVE_SELECTOR).toBe(
      'a, button, [role="link"], [role="button"]'
    );
  });
});

describe("findLegalInteractiveFromTarget", () => {
  it("returns null for missing target, closest, or predicate", () => {
    expect(findLegalInteractiveFromTarget(null, () => true)).toBe(null);
    expect(findLegalInteractiveFromTarget({}, () => true)).toBe(null);
    expect(
      findLegalInteractiveFromTarget({ closest: () => ({}) }, null)
    ).toBe(null);
  });

  it("uses closest with the legal interactive selector", () => {
    const anchor = { tag: "a" };
    const closest = vi.fn(() => anchor);
    const isLegal = vi.fn(() => true);
    expect(
      findLegalInteractiveFromTarget({ closest }, isLegal)
    ).toBe(anchor);
    expect(closest).toHaveBeenCalledWith(LEGAL_INTERACTIVE_SELECTOR);
    expect(isLegal).toHaveBeenCalledWith(anchor);
  });

  it("returns null when closest misses or isLikelyLegalLink rejects", () => {
    expect(
      findLegalInteractiveFromTarget(
        { closest: () => null },
        () => true
      )
    ).toBe(null);
    const el = { id: "billing-tab" };
    expect(
      findLegalInteractiveFromTarget({ closest: () => el }, () => false)
    ).toBe(null);
  });
});

describe("classifyElementNavigation", () => {
  it("prefers real href / data-href over modal and click-to-load paths", () => {
    expect(
      classifyElementNavigation({ href: "https://example.com/terms" })
    ).toEqual({ type: "url", value: "https://example.com/terms" });
    expect(
      classifyElementNavigation({
        href: "",
        dataHref: "/privacy-policy",
      })
    ).toEqual({ type: "url", value: "/privacy-policy" });
  });

  it("rejects hash and javascript: hrefs as direct URLs, then checks data-url", () => {
    expect(
      classifyElementNavigation({
        href: "#",
        dataUrl: "https://example.com/refund",
      })
    ).toEqual({ type: "url", value: "https://example.com/refund" });
    expect(
      classifyElementNavigation({
        href: "javascript:void(0)",
        dataLink: "/legal/terms",
      })
    ).toEqual({ type: "url", value: "/legal/terms" });
  });

  it("maps Bootstrap data-target / data-bs-target fragments to modal", () => {
    expect(
      classifyElementNavigation({
        href: "#",
        dataTarget: "#terms-modal",
      })
    ).toEqual({ type: "modal", value: "#terms-modal" });
    expect(
      classifyElementNavigation({
        href: "javascript:void(0)",
        dataBsTarget: "#privacyDialog",
      })
    ).toEqual({ type: "modal", value: "#privacyDialog" });
  });

  it("uses modal-element when modal content was found for empty/#/javascript triggers", () => {
    expect(
      classifyElementNavigation({
        href: "javascript:void(0)",
        modalContentFound: true,
      })
    ).toEqual({ type: "modal-element" });
    expect(
      classifyElementNavigation({ href: "#", modalContentFound: true })
    ).toEqual({ type: "modal-element" });
    expect(
      classifyElementNavigation({ href: "", modalContentFound: true })
    ).toEqual({ type: "modal-element" });
  });

  it("falls back to click-to-load when modal content is not in the DOM yet", () => {
    expect(
      classifyElementNavigation({
        href: "javascript:void(0)",
        modalContentFound: false,
      })
    ).toEqual({ type: "click-to-load" });
    expect(classifyElementNavigation({ href: "#" })).toEqual({
      type: "click-to-load",
    });
  });

  it("returns null for non-exact fragment hrefs (historical gap)", () => {
    // "#terms-section" is not a fetchable URL and does not enter the modal path
    // (only exact "#"). Locking this avoids silently treating in-page anchors
    // as click-to-load and prompting users incorrectly.
    expect(
      classifyElementNavigation({ href: "#terms-section" })
    ).toBe(null);
    expect(
      classifyElementNavigation({ href: "#privacy" })
    ).toBe(null);
  });

  it("ignores non-hash data-target values", () => {
    expect(
      classifyElementNavigation({
        href: "#",
        dataTarget: "terms-modal",
      })
    ).toEqual({ type: "click-to-load" });
  });
});
