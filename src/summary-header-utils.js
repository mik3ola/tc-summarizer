/**
 * Pure helpers for summary popover header title + confidence badge text.
 * Prevents regressions in empty-title fallback and cached-badge labeling
 * (XSS-escaped at render sites; this module only shapes display strings).
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for classic content scripts.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestSummaryHeaderUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const DEFAULT_SUMMARY_TITLE = "Summary";
  const DEFAULT_CONFIDENCE = "medium";

  /**
   * Display title for the summary header.
   * Non-string / blank / whitespace-only titles fall back to "Summary".
   */
  function resolveSummaryTitle(summary) {
    const raw = summary?.title;
    if (typeof raw === "string" && raw.trim()) return raw.trim();
    return DEFAULT_SUMMARY_TITLE;
  }

  /**
   * Confidence label shown in the header badge.
   * Missing confidence defaults to "medium"; cached results append " • cached".
   */
  function resolveConfidenceBadgeText(confidence, fromCache = false) {
    const level =
      typeof confidence === "string" && confidence.trim()
        ? confidence.trim()
        : DEFAULT_CONFIDENCE;
    return fromCache ? `${level} • cached` : level;
  }

  return {
    DEFAULT_SUMMARY_TITLE,
    DEFAULT_CONFIDENCE,
    resolveSummaryTitle,
    resolveConfidenceBadgeText,
  };
});
