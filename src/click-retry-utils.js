/**
 * Pure helpers for the click-and-retry post-wait path.
 * After the user clicks "Click to open & summarize", the content script waits
 * then re-runs findModalContent — this locks summarize vs the fixed not-found
 * error string.
 *
 * Distinct from:
 * - summary-flow-utils (#29) resolveDynamicNavigationOutcome / resolveHoverLinkAction
 *   (pre-click modal-element vs click-to-load and startHover routing)
 * - summary-popover-utils (#30) resolvePopoverAction (data-action → intent only)
 * - summarize-extract-utils (#39) fetch / empty-text / modal min-length gates
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for classic content scripts.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestClickRetryUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /** Historical wait after clicking the anchor before re-running modal discovery. */
  const CLICK_RETRY_WAIT_MS = 1500;

  const CLICK_RETRY_NOT_FOUND_MESSAGE =
    "Content still not found after clicking. The page may use a different loading mechanism.";

  /**
   * Post-wait outcome for data-action="click-and-retry".
   * Caller still owns: anchor.click(), renderLoading, setTimeout delay, and
   * invoking summarizeModalElement / renderError.
   *
   * @param {Element|null|undefined} modalContent result of findModalContent(anchor)
   * @returns {{ action: "summarize_modal_element", modalContent: Element } | { action: "error", errorMessage: string }}
   */
  function resolveClickAndRetryAfterWait(modalContent) {
    if (modalContent) {
      return { action: "summarize_modal_element", modalContent };
    }
    return {
      action: "error",
      errorMessage: CLICK_RETRY_NOT_FOUND_MESSAGE,
    };
  }

  return {
    CLICK_RETRY_WAIT_MS,
    CLICK_RETRY_NOT_FOUND_MESSAGE,
    resolveClickAndRetryAfterWait,
  };
});
