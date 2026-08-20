/**
 * Pure helpers for Pro subscription-management chrome on the options page.
 * Locks cancel vs re-enable button visibility (driven by autoRenew) and the
 * Free/Pro plan-hint + Pro API-key badge copy — high blast-radius billing UX.
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for options.html script load.
 * Distinct from account-card visibility (#32) and backend resolveDowngradeAction (#28).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestSubscriptionManagementUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const PRO_PLAN_HINT =
    "Pro: 50 summaries/month included. Add your own API key below for unlimited.";
  const FREE_PLAN_HINT =
    "Free: 5 summaries/month. Upgrade to Pro for 50/month and API key access.";
  const PRO_API_KEY_HINT_HTML =
    "Your Pro plan is active. Add your own key for <strong>unlimited</strong> usage.";

  /**
   * Button display styles inside the Pro-only subscription management section.
   * `autoRenew` should already be normalized (`!== false` at the call site).
   */
  function resolveSubscriptionManagementControls({ autoRenew = true } = {}) {
    const renewing = !!autoRenew;
    return {
      cancelDisplay: renewing ? "inline-block" : "none",
      reEnableDisplay: renewing ? "none" : "inline-block",
      downgradeDisplay: "inline-block",
    };
  }

  /**
   * Plan hint under the account badge. Guest path does not set this string.
   * @param {"pro"|"free"|string|null|undefined} tier
   * @returns {string|null}
   */
  function resolvePlanHintText(tier) {
    if (tier === "pro") return PRO_PLAN_HINT;
    if (tier === "free") return FREE_PLAN_HINT;
    return null;
  }

  /** Pro-only API key card chrome (badge + hint HTML). */
  function resolveProApiKeyChrome() {
    return {
      hintHtml: PRO_API_KEY_HINT_HTML,
      badgeText: "Optional",
      badgeClass: "badge badge-info",
    };
  }

  return {
    PRO_PLAN_HINT,
    FREE_PLAN_HINT,
    PRO_API_KEY_HINT_HTML,
    resolveSubscriptionManagementControls,
    resolvePlanHintText,
    resolveProApiKeyChrome,
  };
});
