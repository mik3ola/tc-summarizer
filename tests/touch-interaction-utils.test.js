import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  LEGAL_INTERACTIVE_SELECTOR,
  findInteractiveCandidateFromTarget,
  findLegalAnchorFromEventTarget,
  shouldStartHoverOnMouseover,
  shouldCancelPendingHoverOnMouseout,
  resolveTouchLegalClick,
  shouldClosePopoverOnOutsideClick,
} = require("../src/touch-interaction-utils.js");

function fakeTarget(closestResult) {
  return {
    closest(sel) {
      expect(sel).toBe(LEGAL_INTERACTIVE_SELECTOR);
      return closestResult;
    },
  };
}

describe("findInteractiveCandidateFromTarget / findLegalAnchorFromEventTarget", () => {
  it("returns null for missing targets or closest()", () => {
    expect(findInteractiveCandidateFromTarget(null)).toBeNull();
    expect(findInteractiveCandidateFromTarget({})).toBeNull();
    expect(findLegalAnchorFromEventTarget(null, () => true)).toBeNull();
  });

  it("returns the closest interactive node when present", () => {
    const anchor = { tag: "A" };
    expect(findInteractiveCandidateFromTarget(fakeTarget(anchor))).toBe(anchor);
  });

  it("filters through isLikelyLegalLink", () => {
    const el = { id: "terms" };
    expect(findLegalAnchorFromEventTarget(fakeTarget(el), () => true)).toBe(el);
    expect(findLegalAnchorFromEventTarget(fakeTarget(el), () => false)).toBeNull();
    expect(findLegalAnchorFromEventTarget(fakeTarget(el), null)).toBeNull();
  });
});

describe("shouldStartHoverOnMouseover", () => {
  const base = {
    hasUiHost: true,
    touchSummarize: false,
    autoHover: true,
    hasLegalAnchor: true,
    alreadyShowingForAnchor: false,
  };

  it("starts hover on desktop when auto-hover finds a legal link", () => {
    expect(shouldStartHoverOnMouseover(base)).toBe(true);
  });

  it("skips hover entirely on touch to avoid hover+tap double-fire", () => {
    expect(shouldStartHoverOnMouseover({ ...base, touchSummarize: true })).toBe(false);
  });

  it("respects missing host, disabled auto-hover, non-legal targets, and already-open", () => {
    expect(shouldStartHoverOnMouseover({ ...base, hasUiHost: false })).toBe(false);
    expect(shouldStartHoverOnMouseover({ ...base, autoHover: false })).toBe(false);
    expect(shouldStartHoverOnMouseover({ ...base, hasLegalAnchor: false })).toBe(false);
    expect(shouldStartHoverOnMouseover({ ...base, alreadyShowingForAnchor: true })).toBe(
      false
    );
  });
});

describe("shouldCancelPendingHoverOnMouseout", () => {
  it("cancels only a pending timer for the same desktop anchor", () => {
    expect(
      shouldCancelPendingHoverOnMouseout({
        hasUiHost: true,
        touchSummarize: false,
        isSameAnchor: true,
        popoverVisible: false,
      })
    ).toBe(true);
  });

  it("does not cancel once the popover is visible or on touch", () => {
    expect(
      shouldCancelPendingHoverOnMouseout({
        hasUiHost: true,
        touchSummarize: false,
        isSameAnchor: true,
        popoverVisible: true,
      })
    ).toBe(false);
    expect(
      shouldCancelPendingHoverOnMouseout({
        hasUiHost: true,
        touchSummarize: true,
        isSameAnchor: true,
        popoverVisible: false,
      })
    ).toBe(false);
    expect(
      shouldCancelPendingHoverOnMouseout({
        hasUiHost: true,
        touchSummarize: false,
        isSameAnchor: false,
        popoverVisible: false,
      })
    ).toBe(false);
  });
});

describe("resolveTouchLegalClick", () => {
  const base = {
    hasUiHost: true,
    touchSummarize: true,
    autoHover: true,
    clickInsideHost: false,
    hasLegalAnchor: true,
    alreadyOpenForAnchor: false,
  };

  it("starts summary on first legal-link tap (preventDefault)", () => {
    expect(resolveTouchLegalClick(base)).toEqual({
      action: "start_summary",
      preventDefault: true,
    });
  });

  it("keeps an already-open popover without restarting summarize", () => {
    expect(resolveTouchLegalClick({ ...base, alreadyOpenForAnchor: true })).toEqual({
      action: "keep_open",
      preventDefault: true,
    });
  });

  it("ignores desktop, disabled auto-hover, host clicks, and non-legal taps", () => {
    expect(resolveTouchLegalClick({ ...base, touchSummarize: false }).action).toBe(
      "ignore"
    );
    expect(resolveTouchLegalClick({ ...base, autoHover: false }).action).toBe("ignore");
    expect(resolveTouchLegalClick({ ...base, clickInsideHost: true }).action).toBe(
      "ignore"
    );
    expect(resolveTouchLegalClick({ ...base, hasLegalAnchor: false }).action).toBe(
      "ignore"
    );
    expect(resolveTouchLegalClick({ ...base, hasUiHost: false }).preventDefault).toBe(
      false
    );
  });
});

describe("shouldClosePopoverOnOutsideClick", () => {
  const base = {
    hasUiHost: true,
    popoverVisible: true,
    clickInsideHost: false,
    touchSummarize: false,
    hasLegalAnchor: false,
  };

  it("closes on a true outside click on desktop", () => {
    expect(shouldClosePopoverOnOutsideClick(base)).toBe(true);
  });

  it("does not close when a touch legal-link tap is still being handled", () => {
    expect(
      shouldClosePopoverOnOutsideClick({
        ...base,
        touchSummarize: true,
        hasLegalAnchor: true,
      })
    ).toBe(false);
  });

  it("does not close when host missing, popover hidden, or click is inside host", () => {
    expect(shouldClosePopoverOnOutsideClick({ ...base, hasUiHost: false })).toBe(false);
    expect(shouldClosePopoverOnOutsideClick({ ...base, popoverVisible: false })).toBe(
      false
    );
    expect(shouldClosePopoverOnOutsideClick({ ...base, clickInsideHost: true })).toBe(
      false
    );
  });
});
