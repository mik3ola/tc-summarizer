/**
 * Pure helpers for applying downgrade-subscription API results to local storage.
 * Locks the options-page write shape after cancel / re-enable / downgrade_now.
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for options.html script load.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestDowngradeStorageUtils = api;
  root.buildDowngradeLocalStoragePatch = api.buildDowngradeLocalStoragePatch;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /**
   * Build chrome.storage.local patch after a successful downgrade API call.
   * Matches historical options.js write behavior (including downgrade_now clearing
   * scheduled-for / period-end locally even if the API returns schedule fields).
   *
   * @returns {object|null} storage patch, or null for unknown action
   */
  function buildDowngradeLocalStoragePatch(action, subscription) {
    if (action === "cancel_auto_renew") {
      return {
        subscriptionAutoRenew: false,
        subscriptionDowngradeScheduledFor:
          subscription?.downgrade_scheduled_for || null,
        currentPeriodEnd: subscription?.current_period_end || null,
      };
    }

    if (action === "re_enable_auto_renew") {
      return {
        subscriptionAutoRenew: true,
        subscriptionDowngradeScheduledFor: null,
      };
    }

    if (action === "downgrade_now") {
      return {
        subscription: subscription?.status,
        subscriptionPlan: subscription?.plan,
        subscriptionAutoRenew: false,
        subscriptionDowngradeScheduledFor: null,
        currentPeriodEnd: null,
      };
    }

    return null;
  }

  return {
    buildDowngradeLocalStoragePatch,
  };
});
