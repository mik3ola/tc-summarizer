/**
 * Pure HTML/attribute escaping for summary popover innerHTML.
 * Model output (title, tldr, quotes, red flags) and error copy are interpolated
 * into the shadow DOM — regressions here are XSS / broken markup.
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for classic content scripts.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestHtmlEscapeUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /**
   * Escape text for HTML body / text-node contexts.
   * Order matters: `&` first so later entity introductions are not re-escaped.
   *
   * @param {unknown} s
   * @returns {string}
   */
  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  /**
   * Escape for double-quoted attribute values (title, href).
   * Newlines become spaces so attribute values stay single-line.
   *
   * @param {unknown} s
   * @returns {string}
   */
  function escapeAttr(s) {
    return escapeHtml(s).replaceAll("\n", " ");
  }

  return { escapeHtml, escapeAttr };
});
