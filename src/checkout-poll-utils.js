/**
 * Pure helpers for options billing UX after checkout / upgrade deep-links.
 * Locks flexible Pro activation detection, poll exhaustion, and signed-in
 * vs guest follow-up when options opens with an upgrade intent.
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for options.html script load.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestCheckoutPollUtils = api;
  root.isFlexibleProPlan = api.isFlexibleProPlan;
  root.resolveCheckoutPollOutcome = api.resolveCheckoutPollOutcome;
  root.resolveUpgradeDeepLinkFollowUp = api.resolveUpgradeDeepLinkFollowUp;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /**
   * Options checkout polling uses a flexible Pro check: plan="pro" alone is
   * enough (status need not be "active"). Matches historical options.js.
   */
  function isFlexibleProPlan({ subscription = null, subscriptionPlan = null } = {}) {
    return (
      (subscription === "active" && subscriptionPlan === "pro") ||
      subscriptionPlan === "pro"
    );
  }

  /**
   * Decide the next step while polling local storage after opening Stripe checkout.
   * @returns {"activated"|"continue"|"exhausted"}
   */
  function resolveCheckoutPollOutcome({
    subscription = null,
    subscriptionPlan = null,
    pollCount = 0,
    maxPolls = 20,
  } = {}) {
    if (isFlexibleProPlan({ subscription, subscriptionPlan })) {
      return "activated";
    }
    if (pollCount >= maxPolls) {
      return "exhausted";
    }
    return "continue";
  }

  /**
   * After upgrade intent is confirmed, choose signed-in checkout click vs sign-in prompt.
   * @returns {"click_upgrade"|"show_signin_modal"}
   */
  function resolveUpgradeDeepLinkFollowUp(supabaseSession) {
    if (supabaseSession?.access_token) {
      return "click_upgrade";
    }
    return "show_signin_modal";
  }

  return {
    isFlexibleProPlan,
    resolveCheckoutPollOutcome,
    resolveUpgradeDeepLinkFollowUp,
  };
});
