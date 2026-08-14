import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  shouldClosePopoverOnDocumentClick,
  shouldCancelPendingHoverOnMouseOut,
  shouldIgnoreTouchRetapOfOpenAnchor,
} = require("../src/popover-dismiss-utils.js");

describe("shouldClosePopoverOnDocumentClick", () => {
  it("closes only for outside clicks while the popover is visible", () => {
    expect(
      shouldClosePopoverOnDocumentClick({
        hasUiHost: true,
        popoverVisible: true,
        clickInsideHost: false,
        touchSummarize: false,
        clickedLegalAnchor: false,
      })
    ).toBe(true);

    expect(
      shouldClosePopoverOnDocumentClick({
        hasUiHost: false,
        popoverVisible: true,
        clickInsideHost: false,
      })
    ).toBe(false);

    expect(
      shouldClosePopoverOnDocumentClick({
        hasUiHost: true,
        popoverVisible: false,
        clickInsideHost: false,
      })
    ).toBe(false);

    expect(
      shouldClosePopoverOnDocumentClick({
        hasUiHost: true,
        popoverVisible: true,
        clickInsideHost: true,
      })
    ).toBe(false);
  });

  it("does not close on touch when the click is another legal-link tap", () => {
    expect(
      shouldClosePopoverOnDocumentClick({
        hasUiHost: true,
        popoverVisible: true,
        clickInsideHost: false,
        touchSummarize: true,
        clickedLegalAnchor: true,
      })
    ).toBe(false);

    expect(
      shouldClosePopoverOnDocumentClick({
        hasUiHost: true,
        popoverVisible: true,
        clickInsideHost: false,
        touchSummarize: true,
        clickedLegalAnchor: false,
      })
    ).toBe(true);
  });
});

describe("shouldCancelPendingHoverOnMouseOut", () => {
  it("cancels only pending desktop hover for the current anchor", () => {
    expect(
      shouldCancelPendingHoverOnMouseOut({
        touchSummarize: false,
        isCurrentAnchor: true,
        popoverVisible: false,
      })
    ).toBe(true);

    expect(
      shouldCancelPendingHoverOnMouseOut({
        touchSummarize: false,
        isCurrentAnchor: true,
        popoverVisible: true,
      })
    ).toBe(false);

    expect(
      shouldCancelPendingHoverOnMouseOut({
        touchSummarize: false,
        isCurrentAnchor: false,
        popoverVisible: false,
      })
    ).toBe(false);

    expect(
      shouldCancelPendingHoverOnMouseOut({
        touchSummarize: true,
        isCurrentAnchor: true,
        popoverVisible: false,
      })
    ).toBe(false);
  });
});

describe("shouldIgnoreTouchRetapOfOpenAnchor", () => {
  it("ignores retap only when touch mode and popover already open for that anchor", () => {
    expect(
      shouldIgnoreTouchRetapOfOpenAnchor({
        touchSummarize: true,
        isCurrentAnchor: true,
        popoverVisible: true,
      })
    ).toBe(true);

    expect(
      shouldIgnoreTouchRetapOfOpenAnchor({
        touchSummarize: true,
        isCurrentAnchor: true,
        popoverVisible: false,
      })
    ).toBe(false);

    expect(
      shouldIgnoreTouchRetapOfOpenAnchor({
        touchSummarize: false,
        isCurrentAnchor: true,
        popoverVisible: true,
      })
    ).toBe(false);
  });
});
