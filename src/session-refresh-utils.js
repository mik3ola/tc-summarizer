/**
 * Pure helper for the next refresh_token after a Supabase token refresh.
 * Background and options historically diverge when the response omits refresh_token —
 * keep both policies explicit and tested rather than silently unifying.
 *
 * Dual export: CommonJS for Node/Vitest; globalThis + importScripts for MV3 / pages.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestSessionRefreshUtils = api;
  root.pickNextRefreshToken = api.pickNextRefreshToken;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /**
   * @param {string|null|undefined} responseRefreshToken
   * @param {string|null|undefined} previousRefreshToken
   * @param {{ preservePreviousIfMissing?: boolean }} [opts]
   *   - false (background): store response token as-is (empty → null)
   *   - true (options): fall back to previous token when response omits one
   */
  function pickNextRefreshToken(
    responseRefreshToken,
    previousRefreshToken,
    { preservePreviousIfMissing = false } = {}
  ) {
    if (responseRefreshToken) return responseRefreshToken;
    if (preservePreviousIfMissing) return previousRefreshToken || null;
    return responseRefreshToken || null;
  }

  return { pickNextRefreshToken };
});
