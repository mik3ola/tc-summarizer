/**
 * Shared session expiry gate (5-minute skew buffer) used by background getSettings
 * and background/options status refresh before calling Supabase.
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for MV3 worker / options page.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestSessionExpiryUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /** Refresh when fewer than 5 minutes remain before expires_at. */
  const SESSION_EXPIRY_BUFFER_MS = 300000;

  /**
   * @param {number|null|undefined} expiresAtMs epoch ms from stored session.expires_at
   * @param {number} [nowMs]
   * @returns {boolean} true when missing/invalid expiry is treated as not expired
   *   (matches historical `session?.expires_at && (expires_at - buffer) < now`).
   */
  function isSessionExpired(expiresAtMs, nowMs = Date.now()) {
    if (!expiresAtMs) return false;
    return expiresAtMs - SESSION_EXPIRY_BUFFER_MS < nowMs;
  }

  return {
    SESSION_EXPIRY_BUFFER_MS,
    isSessionExpired,
  };
});
