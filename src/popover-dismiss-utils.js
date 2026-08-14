/**
 * Pure helpers for summary popover dismiss / hover-cancel policies.
 * Locks Safari touch vs desktop divergence: outside-click close, retap of open
 * anchor, and mouseout only cancelling a pending (not-yet-shown) hover.
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for classic content scripts.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestPopoverDismissUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /**
   * Document-capture click: close when popover is open and the click is outside
   * the shadow host. On touch, a legal-link tap is handled by the touch path and
   * must not immediately close.
   */
  function shouldClosePopoverOnDocumentClick({
    hasUiHost = false,
    popoverVisible = false,
    clickInsideHost = false,
    touchSummarize = false,
    clickedLegalAnchor = false,
  } = {}) {
    if (!hasUiHost) return false;
    if (!popoverVisible) return false;
    if (clickInsideHost) return false;
    if (touchSummarize && clickedLegalAnchor) return false;
    return true;
  }

  /**
   * mouseout: only clear the hover timer when leaving the current anchor before
   * the popover is shown (sticky-open once visible).
   */
  function shouldCancelPendingHoverOnMouseOut({
    touchSummarize = false,
    isCurrentAnchor = false,
    popoverVisible = false,
  } = {}) {
    if (touchSummarize) return false;
    return !!(isCurrentAnchor && !popoverVisible);
  }

  /**
   * Touch tap on the already-open legal anchor: preventDefault/stopPropagation
   * and do not restart summarize (outside-click / popover own handlers own it).
   */
  function shouldIgnoreTouchRetapOfOpenAnchor({
    touchSummarize = false,
    isCurrentAnchor = false,
    popoverVisible = false,
  } = {}) {
    return !!(touchSummarize && isCurrentAnchor && popoverVisible);
  }

  return {
    shouldClosePopoverOnDocumentClick,
    shouldCancelPendingHoverOnMouseOut,
    shouldIgnoreTouchRetapOfOpenAnchor,
  };
});
