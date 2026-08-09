/**
 * Pure helpers for the options-page logout local-storage wipe.
 * Incomplete clears leave Pro UI, tokens, or schedule fields after logout.
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for options.html script load.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestLogoutStorageUtils = api;
  root.buildLogoutLocalStoragePatch = api.buildLogoutLocalStoragePatch;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /**
   * Exact chrome.storage.local patch applied on logout.
   * Clears session + subscription + auto-renew / schedule / period-end fields.
   */
  function buildLogoutLocalStoragePatch() {
    return {
      subscription: null,
      subscriptionPlan: null,
      userEmail: null,
      supabaseSession: null,
      subscriptionAutoRenew: null,
      subscriptionDowngradeScheduledFor: null,
      currentPeriodEnd: null,
    };
  }

  return {
    buildLogoutLocalStoragePatch,
  };
});
