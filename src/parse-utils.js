/**
 * Pure parsing helpers shared by the background service worker and Vitest.
 * Dual export: CommonJS for Node/Vitest; globalThis + importScripts for MV3 worker.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestParseUtils = api;
  // Hoist for importScripts consumers that expect bare names.
  root.normalizeUrl = api.normalizeUrl;
  root.safeJsonParse = api.safeJsonParse;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function normalizeUrl(url) {
    try {
      const u = new URL(url);
      u.hash = "";
      return u.toString();
    } catch {
      return url;
    }
  }

  function safeJsonParse(maybeJson) {
    try {
      let cleaned = String(maybeJson ?? "").trim();
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.slice(7);
      } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.slice(3);
      }
      if (cleaned.endsWith("```")) {
        cleaned = cleaned.slice(0, -3);
      }
      return { ok: true, value: JSON.parse(cleaned.trim()) };
    } catch (e) {
      return { ok: false, error: e };
    }
  }

  return { normalizeUrl, safeJsonParse };
});
