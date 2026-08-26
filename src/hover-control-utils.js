/**
 * Pure helpers for hover/popover session control after startHover fields are set:
 * touch tap forces delay 0, closePopover cancels inflight work with a precise
 * field patch, and post-summarize isModalContent drives View source routing.
 *
 * Complements hover-session-utils (URL / click-to-load flag) and
 * source-navigation-utils (consumes isModalContent) without duplicating them.
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for classic content scripts.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestHoverControlUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /** Touch / iOS tap path forces an immediate startHover (no hover delay). */
  const TOUCH_START_HOVER_DELAY_MS = 0;

  /**
   * Delay to use while invoking startHover from the touch capture path.
   * Callers restore the previous HOVER_DELAY_MS after startHover returns.
   */
  function resolveTouchStartHoverDelayMs() {
    return TOUCH_START_HOVER_DELAY_MS;
  }

  /**
   * Field patch applied by closePopover before hidePopover().
   * Locks historical behavior:
   * - requestId bumps to cancel inflight summarize work
   * - anchor + url cleared
   * - originalHref and isModalContent are intentionally NOT cleared here
   *   (hidePopover clears the summary snapshot separately)
   *
   * @param {number} requestId
   * @returns {{
   *   requestId: number,
   *   anchor: null,
   *   url: null,
   *   clearHoverTimer: true,
   *   hidePopover: true
   * }}
   */
  function buildClosePopoverSessionPatch(requestId) {
    const prev =
      typeof requestId === "number" && Number.isFinite(requestId) ? requestId : 0;
    return {
      requestId: prev + 1,
      anchor: null,
      url: null,
      clearHoverTimer: true,
      hidePopover: true,
    };
  }

  /**
   * Whether closePopover's session patch should leave originalHref /
   * isModalContent untouched (historical content.js).
   */
  function closePopoverPreservesNavigationFlags() {
    return true;
  }

  /**
   * isModalContent assigned after a successful summarize_* call.
   * View source uses this flag to re-click the in-page trigger vs open a URL.
   *
   * @param {"modal"|"modal_element"|"url"|string} source
   * @returns {boolean}
   */
  function resolvePostSummarizeIsModalContent(source) {
    if (source === "modal" || source === "modal_element") return true;
    if (source === "url") return false;
    return false;
  }

  return {
    TOUCH_START_HOVER_DELAY_MS,
    resolveTouchStartHoverDelayMs,
    buildClosePopoverSessionPatch,
    closePopoverPreservesNavigationFlags,
    resolvePostSummarizeIsModalContent,
  };
});
