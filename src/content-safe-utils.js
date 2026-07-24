/**
 * Content-script safety helpers (context invalidation + HTML escaping).
 * Dual export: CommonJS for Node/Vitest; globalThis for classic content scripts.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestContentSafeUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /** True if error is due to extension reload (context invalidated). */
  function isContextInvalidatedError(e) {
    const msg = (e?.message || String(e)).toLowerCase();
    return (
      msg.includes("context invalidated") ||
      msg.includes("message port closed") ||
      msg.includes("reading 'get'") ||
      msg.includes("reading 'sendmessage'") ||
      msg.includes("reading 'runtime'")
    );
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttr(s) {
    return escapeHtml(s).replaceAll("\n", " ");
  }

  return {
    isContextInvalidatedError,
    escapeHtml,
    escapeAttr,
  };
});
