/**
 * Pure helpers for options-page chrome.storage.onChanged → stats refresh.
 * Distinct from content-script footer refresh (#38): options only reloads
 * stats when monthlyUsage actually changes (not on first initialize).
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for options.html script load.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestOptionsUsageRefreshUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /**
   * Gate for options stats refresh on monthlyUsage storage events.
   * Historical policy: area must be local, change must include monthlyUsage,
   * and oldValue !== newValue (skip no-op / first-write-same-value noise).
   *
   * Note: first install where oldValue is undefined and newValue is set
   * still refreshes (undefined !== number) — matching options.js today.
   */
  function shouldRefreshOptionsStatsOnUsageChange(areaName, changes) {
    if (areaName !== "local") return false;
    if (
      !changes ||
      !Object.prototype.hasOwnProperty.call(changes, "monthlyUsage")
    ) {
      return false;
    }
    const entry = changes.monthlyUsage;
    if (!entry || typeof entry !== "object") return false;
    return entry.oldValue !== entry.newValue;
  }

  return {
    shouldRefreshOptionsStatsOnUsageChange,
  };
});
