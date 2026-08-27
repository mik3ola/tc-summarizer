/**
 * Pure URL normalization for background fetch_html / summarize_text cache keys.
 * Stripping the hash keeps `#section` navigations sharing one summary cache entry.
 *
 * Dual export: CommonJS for Node/Vitest; globalThis + importScripts for MV3 worker.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestUrlNormalizeUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /**
   * Drop the URL hash; return the original string if `new URL` throws.
   * Query strings are preserved (historical background.js behavior).
   */
  function normalizeUrl(url) {
    try {
      const u = new URL(url);
      u.hash = "";
      return u.toString();
    } catch {
      return url;
    }
  }

  return {
    normalizeUrl,
  };
});
