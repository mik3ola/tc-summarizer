/**
 * Pure helpers for mapping subscription/usage REST rows into chrome.storage
 * patches. Background merges carefully (preserve usage on zero/failed fetch);
 * options overwrites on a successful refresh path.
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for options.html / importScripts.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestStatusStorageUtils = api;
  root.pickFirstRow = api.pickFirstRow;
  root.mapSubscriptionRow = api.mapSubscriptionRow;
  root.resolveMonthlyUsageForStorage = api.resolveMonthlyUsageForStorage;
  root.buildBackgroundStatusStoragePatch = api.buildBackgroundStatusStoragePatch;
  root.buildOptionsSubscriptionStoragePatch = api.buildOptionsSubscriptionStoragePatch;
  root.buildClearedSubscriptionStoragePatch = api.buildClearedSubscriptionStoragePatch;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /** PostgREST returns either a row array or a single object. */
  function pickFirstRow(rows) {
    return Array.isArray(rows) ? rows[0] : rows;
  }

  /**
   * Map a subscriptions row into normalized fields.
   * `auto_renew` defaults to true when null/undefined (matches options.js).
   */
  function mapSubscriptionRow(sub) {
    if (!sub || typeof sub !== "object") return null;
    return {
      status: sub.status || null,
      plan: sub.plan || null,
      autoRenew: sub.auto_renew !== false,
      downgradeScheduledFor: sub.downgrade_scheduled_for || null,
      currentPeriodEnd: sub.current_period_end || null,
    };
  }

  /**
   * Background status refresh: avoid clobbering a known usage count with 0 when
   * the fetch likely failed or returned an empty row. Legitimate 0 is accepted
   * only when storage has never set monthlyUsage.
   */
  function resolveMonthlyUsageForStorage(fetchedUsage, currentMonthlyUsage) {
    const fetched = Number(fetchedUsage) || 0;
    return fetched > 0 || (fetched === 0 && currentMonthlyUsage === undefined)
      ? fetched
      : currentMonthlyUsage ?? fetched;
  }

  /**
   * Merge freshly fetched status/usage into background storage without wiping
   * prior values when a field was not successfully resolved (null).
   */
  function buildBackgroundStatusStoragePatch({
    status = null,
    plan = null,
    monthlyUsage = 0,
    cycleAnchorDate = null,
    sessionEmail = null,
    currentStorage = {},
  } = {}) {
    return {
      subscription: status !== null ? status : currentStorage.subscription,
      subscriptionPlan: plan !== null ? plan : currentStorage.subscriptionPlan,
      userEmail: sessionEmail || currentStorage.userEmail || null,
      monthlyUsage: resolveMonthlyUsageForStorage(
        monthlyUsage,
        currentStorage.monthlyUsage
      ),
      cycleAnchorDate:
        cycleAnchorDate !== null
          ? cycleAnchorDate
          : currentStorage.cycleAnchorDate ?? null,
    };
  }

  /** Options successful-refresh overwrite (includes auto-renew management fields). */
  function buildOptionsSubscriptionStoragePatch({
    status = null,
    plan = null,
    autoRenew = true,
    downgradeScheduledFor = null,
    currentPeriodEnd = null,
    monthlyUsage = 0,
    cycleAnchorDate = null,
    userEmail = null,
  } = {}) {
    return {
      subscription: status,
      subscriptionPlan: plan,
      userEmail: userEmail || null,
      monthlyUsage,
      cycleAnchorDate,
      subscriptionAutoRenew: autoRenew,
      subscriptionDowngradeScheduledFor: downgradeScheduledFor,
      currentPeriodEnd,
    };
  }

  /** When the user has no subscriptions row, clear plan fields only. */
  function buildClearedSubscriptionStoragePatch() {
    return {
      subscription: null,
      subscriptionPlan: null,
    };
  }

  return {
    pickFirstRow,
    mapSubscriptionRow,
    resolveMonthlyUsageForStorage,
    buildBackgroundStatusStoragePatch,
    buildOptionsSubscriptionStoragePatch,
    buildClearedSubscriptionStoragePatch,
  };
});
