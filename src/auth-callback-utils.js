/**
 * Pure helpers for the external `auth_callback` message stub in background.js.
 * Locks the historical storage patch without widening who may invoke it —
 * caller still owns sender trust / chrome.runtime.onMessageExternal gating.
 *
 * Dual export: CommonJS for Node/Vitest; globalThis + importScripts for MV3 worker.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestAuthCallbackUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /**
   * Decide whether an external message is a handled auth_callback and, if so,
   * which chrome.storage.local fields to write.
   *
   * Historical stub behavior (intentionally preserved):
   * - Requires `type === "auth_callback"` AND a truthy `token` (gate only —
   *   the token itself is not persisted).
   * - Sets subscription to "active" and userEmail to message.email || "Subscriber".
   */
  function resolveExternalAuthCallback(message) {
    if (!message || message.type !== "auth_callback" || !message.token) {
      return { handled: false, storagePatch: null };
    }
    return {
      handled: true,
      storagePatch: {
        subscription: "active",
        userEmail: message.email || "Subscriber",
      },
    };
  }

  return {
    resolveExternalAuthCallback,
  };
});
