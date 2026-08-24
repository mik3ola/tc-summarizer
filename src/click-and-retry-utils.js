/**
 * Pure helpers for the popover "Click to open & summarize" flow.
 * After the trigger is clicked and the post-wait timer fires, decide whether
 * to summarize discovered modal content or show the fixed "still not found"
 * error — the highest-risk branch in dynamic legal-content loading.
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for classic content scripts.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestClickAndRetryUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /** Milliseconds to wait after clicking the trigger before re-scanning. */
  const CLICK_AND_RETRY_WAIT_MS = 1500;

  const CONTENT_STILL_NOT_FOUND_MESSAGE =
    "Content still not found after clicking. The page may use a different loading mechanism.";

  /**
   * Whether the popover click should enter the click-and-retry path.
   */
  function shouldStartClickAndRetry({ action = null, hasAnchor = false } = {}) {
    return action === "click-and-retry" && !!hasAnchor;
  }

  /**
   * Loading-label URL shown while waiting for dynamic content.
   * Empty/null href still gets the status suffix (matches historical content.js).
   */
  function buildClickAndRetryLoadingUrl(href) {
    return String(href == null ? "" : href) + " (loading content...)";
  }

  /**
   * Post-wait decision after findModalContent runs.
   * @returns {{
   *   action: "summarize_modal_element"|"error",
   *   modalContent?: unknown,
   *   errorMessage?: string
   * }}
   */
  function resolveClickAndRetryPostWaitOutcome(modalContent) {
    if (modalContent) {
      return { action: "summarize_modal_element", modalContent };
    }
    return {
      action: "error",
      errorMessage: CONTENT_STILL_NOT_FOUND_MESSAGE,
    };
  }

  return {
    CLICK_AND_RETRY_WAIT_MS,
    CONTENT_STILL_NOT_FOUND_MESSAGE,
    shouldStartClickAndRetry,
    buildClickAndRetryLoadingUrl,
    resolveClickAndRetryPostWaitOutcome,
  };
});
