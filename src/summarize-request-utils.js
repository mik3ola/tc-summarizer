/**
 * Pure helpers for background summarize_text request shaping.
 * Locks cache-key format and the empty-text reject path after truncation
 * (before any backend / OpenAI call).
 *
 * Dual export: CommonJS for Node/Vitest; globalThis + importScripts for MV3 worker.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestSummarizeRequestUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const DEFAULT_MAX_TEXT_CHARS = 45_000;
  const EMPTY_TEXT_ERROR = "No text extracted from page.";

  /** Stable summariesCache key for a normalized page URL. */
  function buildSummaryCacheKey(url) {
    return `summary:${url == null ? "" : String(url)}`;
  }

  /**
   * Truncate then reject whitespace-only payloads.
   * @returns {{ ok: true, text: string } | { ok: false, error: string }}
   */
  function resolveSummarizeTextInput(rawText, maxChars = DEFAULT_MAX_TEXT_CHARS) {
    const textIn = typeof rawText === "string" ? rawText : "";
    const limit =
      typeof maxChars === "number" && Number.isFinite(maxChars) && maxChars > 0
        ? maxChars
        : DEFAULT_MAX_TEXT_CHARS;
    const text = textIn.length > limit ? textIn.slice(0, limit) : textIn;
    if (!text.trim()) {
      return { ok: false, error: EMPTY_TEXT_ERROR };
    }
    return { ok: true, text };
  }

  return {
    DEFAULT_MAX_TEXT_CHARS,
    EMPTY_TEXT_ERROR,
    buildSummaryCacheKey,
    resolveSummarizeTextInput,
  };
});
