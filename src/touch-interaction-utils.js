/**
 * Pure helpers for Safari / touch vs desktop hover summarize routing.
 * Prevents hover+tap double-fire and outside-click races on touch devices.
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for classic content scripts.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestTouchInteractionUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /** Interactive nodes that may carry legal-link intent. */
  const LEGAL_INTERACTIVE_SELECTOR = 'a, button, [role="link"], [role="button"]';

  /**
   * Walk from an event target to the nearest interactive candidate.
   * Legal-link filtering is left to the caller (DOM-dependent).
   * @param {{ closest?: (sel: string) => Element|null }|null|undefined} target
   * @returns {Element|null}
   */
  function findInteractiveCandidateFromTarget(target) {
    if (!target || typeof target.closest !== "function") return null;
    return target.closest(LEGAL_INTERACTIVE_SELECTOR);
  }

  /**
   * Resolve a legal anchor from an event target using an injectable predicate.
   * @param {Element|null|undefined} target
   * @param {(el: Element) => boolean} isLikelyLegalLink
   * @returns {Element|null}
   */
  function findLegalAnchorFromEventTarget(target, isLikelyLegalLink) {
    const el = findInteractiveCandidateFromTarget(target);
    if (!el) return null;
    if (typeof isLikelyLegalLink !== "function" || !isLikelyLegalLink(el)) return null;
    return el;
  }

  /**
   * Desktop mouseover: whether to start a hover summarize for this target.
   * Touch devices skip hover entirely to avoid hover+tap double-fire.
   */
  function shouldStartHoverOnMouseover({
    hasUiHost = false,
    touchSummarize = false,
    autoHover = false,
    hasLegalAnchor = false,
    alreadyShowingForAnchor = false,
  } = {}) {
    if (!hasUiHost || touchSummarize || !autoHover || !hasLegalAnchor) return false;
    if (alreadyShowingForAnchor) return false;
    return true;
  }

  /**
   * Desktop mouseout: cancel a pending (not-yet-shown) hover timer only.
   */
  function shouldCancelPendingHoverOnMouseout({
    hasUiHost = false,
    touchSummarize = false,
    isSameAnchor = false,
    popoverVisible = false,
  } = {}) {
    if (!hasUiHost || touchSummarize) return false;
    return !!(isSameAnchor && !popoverVisible);
  }

  /**
   * Touch / iOS click capture path for legal links.
   * @returns {{ action: "ignore"|"keep_open"|"start_summary", preventDefault: boolean }}
   */
  function resolveTouchLegalClick({
    hasUiHost = false,
    touchSummarize = false,
    autoHover = false,
    clickInsideHost = false,
    hasLegalAnchor = false,
    alreadyOpenForAnchor = false,
  } = {}) {
    if (!hasUiHost || !touchSummarize || !autoHover || clickInsideHost || !hasLegalAnchor) {
      return { action: "ignore", preventDefault: false };
    }
    if (alreadyOpenForAnchor) {
      return { action: "keep_open", preventDefault: true };
    }
    return { action: "start_summary", preventDefault: true };
  }

  /**
   * Outside-click close: on touch, a legal-link tap is handled by the capture
   * path above and must not immediately dismiss the popover.
   */
  function shouldClosePopoverOnOutsideClick({
    hasUiHost = false,
    popoverVisible = false,
    clickInsideHost = false,
    touchSummarize = false,
    hasLegalAnchor = false,
  } = {}) {
    if (!hasUiHost || !popoverVisible || clickInsideHost) return false;
    if (touchSummarize && hasLegalAnchor) return false;
    return true;
  }

  return {
    LEGAL_INTERACTIVE_SELECTOR,
    findInteractiveCandidateFromTarget,
    findLegalAnchorFromEventTarget,
    shouldStartHoverOnMouseover,
    shouldCancelPendingHoverOnMouseout,
    resolveTouchLegalClick,
    shouldClosePopoverOnOutsideClick,
  };
});
