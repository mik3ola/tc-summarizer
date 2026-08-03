/**
 * Subscription status / auto-renew copy for the options management card.
 * Dual export: CommonJS for Node/Vitest; globalThis for options.html script load.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestSubscriptionStatusUtils = api;
  root.formatSubStatusLine = api.formatSubStatusLine;
  root.formatSubAutoRenewLine = api.formatSubAutoRenewLine;
  root.resolveProManagementButtons = api.resolveProManagementButtons;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function formatDateShort(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatSubStatusLine(currentPeriodEnd) {
    if (!currentPeriodEnd) return "Subscription: Pro";
    return `Subscription: Pro (expires ${formatDateShort(currentPeriodEnd)})`;
  }

  function formatSubAutoRenewLine(autoRenew, downgradeScheduledFor) {
    if (!autoRenew) {
      if (downgradeScheduledFor) {
        return `Auto-renewal: Disabled. Access until ${formatDateShort(downgradeScheduledFor)}.`;
      }
      return "Auto-renewal: Disabled";
    }
    return "Auto-renewal: Enabled";
  }

  /**
   * Which Pro management buttons to show for a given auto-renew state.
   * Downgrade-now is always available for Pro users on this card.
   */
  function resolveProManagementButtons({ autoRenew = true } = {}) {
    const renewing = !!autoRenew;
    return {
      showCancelAutoRenew: renewing,
      showReEnableAutoRenew: !renewing,
      showDowngradeNow: true,
    };
  }

  return {
    formatSubStatusLine,
    formatSubAutoRenewLine,
    resolveProManagementButtons,
  };
});
