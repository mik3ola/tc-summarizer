/**
 * Plan entitlement helpers shared by background (API access), options UI, and
 * content-script error CTAs. Locks the intentional UI-flexible vs API-strict
 * Pro checks so they cannot silently converge or invert.
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for classic scripts / MV3.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestPlanEntitlementUtils = api;
  root.isProForApiAccess = api.isProForApiAccess;
  root.isProForUi = api.isProForUi;
  root.resolveAccountTier = api.resolveAccountTier;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /**
   * Strict Pro check for paid API features (own-key fallback, backend routing).
   * Requires BOTH active subscription status AND pro plan.
   */
  function isProForApiAccess(subscription, plan) {
    return subscription === "active" && plan === "pro";
  }

  /**
   * Flexible Pro check for UI surfaces (options badge, error CTAs).
   * plan==="pro" alone still counts — matches historical content/options policy
   * for edge cases where status lags plan.
   */
  function isProForUi(subscription, plan) {
    return isProForApiAccess(subscription, plan) || plan === "pro";
  }

  /**
   * Options / account card tier: guest (no email), free, or pro.
   * Uses the flexible UI Pro policy.
   */
  function resolveAccountTier({ email = null, subscription = null, plan = null } = {}) {
    if (!email) return "guest";
    if (isProForUi(subscription, plan)) return "pro";
    return "free";
  }

  return {
    isProForApiAccess,
    isProForUi,
    resolveAccountTier,
  };
});
