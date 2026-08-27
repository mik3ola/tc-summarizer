import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  PARENT_MODAL_WALK_MAX_DEPTH,
  VISIBLE_MODAL_SELECTOR,
  HIDDEN_MODAL_SELECTOR,
  CONTENT_WALK_SELECTOR,
  PARENT_MODAL_MATCHES_SELECTOR,
  resolveBootstrapModalSelector,
  resolveAriaControlsSelector,
  isModalLikeClassName,
  isModalLikeElementSignals,
  resolveParentModalFromAncestorSignals,
} = require("../src/modal-walk-utils.js");

describe("resolveBootstrapModalSelector", () => {
  it("prefers data-target then data-bs-target when hash-prefixed", () => {
    expect(resolveBootstrapModalSelector("#privacy-modal", "#other")).toBe(
      "#privacy-modal"
    );
    expect(resolveBootstrapModalSelector("", "#terms-modal")).toBe("#terms-modal");
    expect(resolveBootstrapModalSelector(null, "#cookie")).toBe("#cookie");
  });

  it("rejects empty and non-hash targets", () => {
    expect(resolveBootstrapModalSelector("", "")).toBe(null);
    expect(resolveBootstrapModalSelector("privacy-modal", null)).toBe(null);
    // Truthy non-hash data-target wins over data-bs-target (|| precedence)
    expect(resolveBootstrapModalSelector("javascript:void(0)", "#x")).toBe(null);
    expect(resolveBootstrapModalSelector(".modal", null)).toBe(null);
    expect(resolveBootstrapModalSelector(null, "not-a-hash")).toBe(null);
  });
});

describe("resolveAriaControlsSelector", () => {
  it("builds #id from aria-controls, else aria-describedby", () => {
    expect(resolveAriaControlsSelector("privacy-dialog", "other")).toBe(
      "#privacy-dialog"
    );
    expect(resolveAriaControlsSelector("", "terms-panel")).toBe("#terms-panel");
    expect(resolveAriaControlsSelector(null, "cookie-box")).toBe("#cookie-box");
  });

  it("returns null only when both are empty", () => {
    expect(resolveAriaControlsSelector("", "")).toBe(null);
    expect(resolveAriaControlsSelector(null, undefined)).toBe(null);
  });

  it("preserves historical truthiness (no trim on whitespace-only ids)", () => {
    expect(resolveAriaControlsSelector("  ", null)).toBe("#  ");
  });
});

describe("isModalLikeClassName / isModalLikeElementSignals", () => {
  it("detects modal/overlay class substrings case-insensitively", () => {
    expect(isModalLikeClassName("WelcomeModal")).toBe(true);
    expect(isModalLikeClassName("page-overlay dark")).toBe(true);
    expect(isModalLikeClassName("card panel")).toBe(false);
    expect(isModalLikeClassName(null)).toBe(false);
  });

  it("treats matchesModalSelector as sufficient", () => {
    expect(
      isModalLikeElementSignals({
        className: "card",
        matchesModalSelector: true,
      })
    ).toBe(true);
    expect(
      isModalLikeElementSignals({
        className: "my-modal",
        matchesModalSelector: false,
      })
    ).toBe(true);
    expect(
      isModalLikeElementSignals({
        className: "card",
        matchesModalSelector: false,
      })
    ).toBe(false);
  });

  it("fails closed when matches() is unavailable (historical gate)", () => {
    expect(
      isModalLikeElementSignals({
        className: "modal",
        matchesModalSelector: false,
        hasMatchesMethod: false,
      })
    ).toBe(false);
  });
});

describe("resolveParentModalFromAncestorSignals", () => {
  const keywords = ["privacy", "terms"];

  it("returns the first modal-like ancestor with keyword-rich text", () => {
    const rich = "x".repeat(201) + " privacy policy";
    const hit = {
      className: "overlay",
      matchesModalSelector: false,
      text: rich,
      id: "hit",
    };
    const result = resolveParentModalFromAncestorSignals(
      [
        { className: "row", matchesModalSelector: false, text: rich },
        hit,
        { className: "modal", matchesModalSelector: true, text: rich },
      ],
      keywords
    );
    expect(result).toBe(hit);
  });

  it("skips modal-like ancestors that fail the length or keyword gate", () => {
    expect(
      resolveParentModalFromAncestorSignals(
        [
          {
            className: "modal",
            matchesModalSelector: true,
            text: "short privacy",
          },
        ],
        keywords
      )
    ).toBe(null);
    expect(
      resolveParentModalFromAncestorSignals(
        [
          {
            className: "modal",
            matchesModalSelector: true,
            text: "y".repeat(250),
          },
        ],
        keywords
      )
    ).toBe(null);
  });

  it("caps the walk at PARENT_MODAL_WALK_MAX_DEPTH", () => {
    expect(PARENT_MODAL_WALK_MAX_DEPTH).toBe(10);
    const rich = "terms " + "z".repeat(200);
    const ancestors = Array.from({ length: 12 }, (_, i) => ({
      className: i === 10 ? "modal" : "wrap",
      matchesModalSelector: i === 10,
      text: rich,
      depth: i,
    }));
    // Index 10 is beyond the depth cap (0..9 only)
    expect(resolveParentModalFromAncestorSignals(ancestors, keywords)).toBe(null);

    ancestors[9] = {
      className: "modal",
      matchesModalSelector: true,
      text: rich,
      depth: 9,
    };
    expect(resolveParentModalFromAncestorSignals(ancestors, keywords).depth).toBe(
      9
    );
  });
});

describe("selector constants", () => {
  it("locks visible / hidden / content-walk / parent matches selectors", () => {
    expect(VISIBLE_MODAL_SELECTOR).toContain(".modal.show");
    expect(VISIBLE_MODAL_SELECTOR).toContain('[role="dialog"]');
    expect(HIDDEN_MODAL_SELECTOR).toContain('[class*="modal"]');
    expect(CONTENT_WALK_SELECTOR).toBe("section, div, article, main");
    expect(PARENT_MODAL_MATCHES_SELECTOR).toBe(
      '.modal, .overlay, [role="dialog"]'
    );
  });
});
