/**
 * Pure helpers for in-page (modal / button) summary cache keys and extract
 * length gates. Wrong keys collide caches across different legal controls on
 * the same page; too-low length gates send empty modals to the API.
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for classic content scripts.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestInlineCacheUtils = api;
  root.normalizeAnchorTextForCacheKey = api.normalizeAnchorTextForCacheKey;
  root.buildInlineSummaryCacheKey = api.buildInlineSummaryCacheKey;
  root.isSummarizableExtractedText = api.isSummarizableExtractedText;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /** Default minimum extracted text length before summarizing a modal/inline block. */
  const DEFAULT_MIN_MODAL_TEXT_CHARS = 50;

  function normalizeAnchorTextForCacheKey(text) {
    return String(text || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .slice(0, 50);
  }

  /**
   * Cache key for summarize_text when content comes from an in-page control
   * (modal selector or discovered modal element). Prefer stable anchor id;
   * fall back to normalized visible text.
   */
  function buildInlineSummaryCacheKey({
    displayUrl = "",
    anchorId = "",
    anchorText = "",
  } = {}) {
    const id = anchorId || normalizeAnchorTextForCacheKey(anchorText);
    return `${displayUrl}#link:${id}`;
  }

  /**
   * Whether extracted modal/inline text is long enough to summarize.
   * Collapses whitespace the same way summarizeModal* does before the length check.
   */
  function isSummarizableExtractedText(
    text,
    minLen = DEFAULT_MIN_MODAL_TEXT_CHARS
  ) {
    const limit =
      typeof minLen === "number" && Number.isFinite(minLen) && minLen > 0
        ? minLen
        : DEFAULT_MIN_MODAL_TEXT_CHARS;
    const cleaned = String(text || "")
      .replace(/\s+/g, " ")
      .trim();
    return cleaned.length >= limit;
  }

  return {
    DEFAULT_MIN_MODAL_TEXT_CHARS,
    normalizeAnchorTextForCacheKey,
    buildInlineSummaryCacheKey,
    isSummarizableExtractedText,
  };
});
