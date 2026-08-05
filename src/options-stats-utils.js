/**
 * Pure helpers for options-page stats derived from the local summaries cache.
 * Minutes-saved aggregates across all cached originals (distinct from the
 * single-summary footer estimate in the content-script popover).
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for options page script tag.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestOptionsStatsUtils = api;
  root.countCacheEntries = api.countCacheEntries;
  root.resolveDisplayedUsage = api.resolveDisplayedUsage;
  root.estimateTotalMinutesSavedFromCache = api.estimateTotalMinutesSavedFromCache;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /** Number of keys in summariesCache (0 when missing). */
  function countCacheEntries(cache) {
    return cache && typeof cache === "object" ? Object.keys(cache).length : 0;
  }

  /**
   * Prefer server monthlyUsage when present; otherwise fall back to local lifetime stats.
   * `null`/`undefined` monthlyUsage → local; `0` is a real monthly count.
   */
  function resolveDisplayedUsage(monthlyUsage, totalSummaries) {
    return monthlyUsage ?? (totalSummaries || 0);
  }

  /**
   * Aggregate ~minutes saved from cached originalTextLength values.
   * Same formula as historical options.js: floor(chars/5) words per entry,
   * then floor(totalWords/200) at ~200 wpm.
   *
   * @param {Record<string, { originalTextLength?: number }>|null|undefined} cache
   * @returns {number}
   */
  function estimateTotalMinutesSavedFromCache(cache) {
    let totalWords = 0;
    if (cache && typeof cache === "object") {
      Object.values(cache).forEach((entry) => {
        if (entry?.originalTextLength) {
          totalWords += Math.floor(entry.originalTextLength / 5);
        }
      });
    }
    return Math.floor(totalWords / 200);
  }

  return {
    countCacheEntries,
    resolveDisplayedUsage,
    estimateTotalMinutesSavedFromCache,
  };
});
