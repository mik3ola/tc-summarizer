/**
 * Pure helpers for touch-first / iOS Safari device detection and options-page
 * tap copy. Detection is shared by content, popup, and options; popup US copy
 * stays in popup-open-settings-utils (#32) — this file owns British options copy.
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for classic scripts.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestTouchDeviceUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /**
   * Prefer tap-to-summarize on phones/tablets and coarse pointers (iOS Safari).
   * Injectable inputs keep unit tests free of real matchMedia / UA globals.
   *
   * iPadOS 13+ may report as Macintosh but still be touch-first when
   * maxTouchPoints > 1.
   */
  function detectTouchSummarize({
    coarsePointer = false,
    userAgent = "",
    maxTouchPoints = 0,
  } = {}) {
    if (coarsePointer) return true;
    const ua = typeof userAgent === "string" ? userAgent : "";
    if (/iPhone|iPad|iPod/i.test(ua)) return true;
    if (/Macintosh/i.test(ua) && (Number(maxTouchPoints) || 0) > 1) return true;
    return false;
  }

  /**
   * Read coarse-pointer / UA / maxTouchPoints from a window-like object.
   * Failures yield non-touch (false) so desktop Chrome stays hover-first.
   */
  function detectTouchSummarizeFromWindow(win) {
    try {
      const w = win || (typeof window !== "undefined" ? window : null);
      if (!w) return false;
      const coarsePointer = !!w.matchMedia?.("(pointer: coarse)")?.matches;
      const userAgent = w.navigator?.userAgent || "";
      const maxTouchPoints = w.navigator?.maxTouchPoints || 0;
      return detectTouchSummarize({
        coarsePointer,
        userAgent,
        maxTouchPoints,
      });
    } catch {
      return false;
    }
  }

  /**
   * Options auto-summarize label/hint when the device is touch-first.
   * Keep British "summarise" here; popup US copy is owned by #32.
   */
  function resolveOptionsTouchSummarizeCopy({ touchSummarize = false } = {}) {
    if (!touchSummarize) return null;
    return {
      label: "Auto-summarise on tap",
      hint: "Automatically show summary when tapping legal links",
    };
  }

  return {
    detectTouchSummarize,
    detectTouchSummarizeFromWindow,
    resolveOptionsTouchSummarizeCopy,
  };
});
