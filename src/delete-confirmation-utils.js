/**
 * Client-side delete-account confirmation gate (options modal).
 * Must stay aligned with backend: confirmation === "DELETE" after trim.
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for options.html script load.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestDeleteConfirmationUtils = api;
  root.isValidDeleteConfirmation = api.isValidDeleteConfirmation;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /**
   * Historical options.js / detached test policy:
   * `(value || "").trim() === "DELETE"`.
   * Backend Deno helper is typeof-string-strict; outcomes match for UI string inputs.
   */
  function isValidDeleteConfirmation(value) {
    return (value || "").trim() === "DELETE";
  }

  return { isValidDeleteConfirmation };
});
