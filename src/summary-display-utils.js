/**
 * Pure helpers for summary popover display (clipboard copy, footer stats).
 * Prevents regressions in preference-gated copy text and cache key matching.
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for classic content scripts.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestSummaryDisplayUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /**
   * Monthly display quota shown in the summary footer.
   * Keep in sync with product tiers (Free 5 / Pro 50 / Enterprise 5000).
   */
  function getDisplayQuotaForPlan(plan) {
    if (plan === "pro") return 50;
    if (plan === "enterprise") return 5000;
    return 5;
  }

  /**
   * Parse hover delay from stored preferences. Invalid/empty => 750ms default.
   */
  function parseHoverDelayMs(hoverDelay, fallback = 750) {
    const n = parseInt(String(hoverDelay ?? ""), 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }

  /**
   * Estimate minutes saved from cached original text length (≈5 chars/word, 200 wpm).
   */
  function estimateMinutesSaved(originalTextLength) {
    const len = Number(originalTextLength);
    if (!Number.isFinite(len) || len <= 0) return 0;
    const words = Math.floor(len / 5);
    return Math.floor(words / 200);
  }

  /**
   * Resolve a summariesCache key for a summary URL.
   * Tries exact/normalized keys first, then fuzzy URL matching (legacy keys).
   * @returns {string|null}
   */
  function resolveSummaryCacheKey(cache, currentSummaryUrl) {
    if (!cache || typeof cache !== "object" || !currentSummaryUrl) return null;

    const normalizedUrl = String(currentSummaryUrl)
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "")
      .toLowerCase();

    const possibleKeys = [
      `summary:${normalizedUrl}`,
      `summary:${currentSummaryUrl}`,
      `summary:${String(currentSummaryUrl).toLowerCase()}`,
    ];

    const exact = possibleKeys.find((key) => cache[key]);
    if (exact) return exact;

    const fuzzy = Object.keys(cache).find((key) => {
      if (!key.startsWith("summary:")) return false;
      const keyUrl = key.replace(/^summary:/, "").toLowerCase();
      return (
        keyUrl === normalizedUrl ||
        keyUrl.includes(normalizedUrl) ||
        normalizedUrl.includes(keyUrl) ||
        keyUrl.split("#")[0] === normalizedUrl.split("#")[0]
      );
    });

    return fuzzy || null;
  }

  /**
   * Build plain-text clipboard payload for a summary.
   * Respects showRedFlags / showQuotes preferences; quotes capped at 3.
   */
  function formatSummaryClipboardText({
    summary,
    sourceUrl = null,
    showRedFlags = true,
    showQuotes = true,
  } = {}) {
    if (!summary || typeof summary !== "object") return "";

    const lines = [];
    if (summary.title) lines.push(summary.title);
    if (summary.tldr) lines.push("\nQuick Summary\n" + summary.tldr);

    const addSection = (heading, arr) => {
      if (!Array.isArray(arr) || !arr.length) return;
      lines.push("\n" + heading);
      arr.forEach((x) => lines.push("• " + x));
    };

    addSection("Costs & renewal", summary.costs_and_renewal);
    addSection("Cancellation & refunds", summary.cancellation_and_refunds);
    addSection("Liability & disputes", summary.liability_and_disputes);
    addSection("Privacy & data", summary.privacy_and_data);
    if (showRedFlags) addSection("Red flags", summary.red_flags);

    if (showQuotes && Array.isArray(summary.quotes)) {
      const validQuotes = summary.quotes.filter((q) => q?.quote);
      if (validQuotes.length) {
        lines.push("\nSupporting quotes");
        validQuotes.slice(0, 3).forEach((q) => {
          lines.push(
            `"${q.quote}"${q.why_it_matters ? " — " + q.why_it_matters : ""}`
          );
        });
      }
    }

    if (sourceUrl) lines.push("\nSource: " + sourceUrl);
    return lines.join("\n");
  }

  return {
    getDisplayQuotaForPlan,
    parseHoverDelayMs,
    estimateMinutesSaved,
    resolveSummaryCacheKey,
    formatSummaryClipboardText,
  };
});
