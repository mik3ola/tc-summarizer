/**
 * Pure cache / request-size helpers for the background service worker.
 * Dual export: CommonJS for Node/Vitest; globalThis + importScripts for MV3 worker.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestCacheUtils = api;
  root.CACHE_TTL_MS = api.CACHE_TTL_MS;
  root.MAX_TEXT_CHARS = api.MAX_TEXT_CHARS;
  root.MAX_CACHE_ENTRIES = api.MAX_CACHE_ENTRIES;
  root.isCachingEnabled = api.isCachingEnabled;
  root.isCacheEntryFresh = api.isCacheEntryFresh;
  root.truncateTextForSummary = api.truncateTextForSummary;
  root.pruneSummariesCache = api.pruneSummariesCache;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
  const MAX_TEXT_CHARS = 45_000; // keep request size reasonable
  const MAX_CACHE_ENTRIES = 200;

  /** Preferences may omit enableCaching; default is enabled. */
  function isCachingEnabled(preferences) {
    return preferences?.enableCaching !== false;
  }

  /**
   * Validate a cache entry and enforce TTL.
   * Returns the entry when usable, otherwise null.
   */
  function isCacheEntryFresh(entry, nowMs = Date.now(), ttlMs = CACHE_TTL_MS) {
    if (!entry || typeof entry !== "object") return null;
    if (!entry.createdAt || typeof entry.createdAt !== "number") return null;
    if (nowMs - entry.createdAt > ttlMs) return null;
    return entry;
  }

  /** Cap page text before sending to the model / backend. */
  function truncateTextForSummary(rawText, maxChars = MAX_TEXT_CHARS) {
    const text = typeof rawText === "string" ? rawText : "";
    return text.length > maxChars ? text.slice(0, maxChars) : text;
  }

  /**
   * Cap cache growth by dropping oldest entries (by createdAt).
   * Mutates a shallow copy; returns the pruned object.
   */
  function pruneSummariesCache(cache, maxEntries = MAX_CACHE_ENTRIES) {
    const next = cache && typeof cache === "object" ? { ...cache } : {};
    const keys = Object.keys(next);
    if (keys.length <= maxEntries) return next;

    keys
      .sort((a, b) => (next[a]?.createdAt ?? 0) - (next[b]?.createdAt ?? 0))
      .slice(0, keys.length - maxEntries)
      .forEach((k) => delete next[k]);

    return next;
  }

  return {
    CACHE_TTL_MS,
    MAX_TEXT_CHARS,
    MAX_CACHE_ENTRIES,
    isCachingEnabled,
    isCacheEntryFresh,
    truncateTextForSummary,
    pruneSummariesCache,
  };
});
