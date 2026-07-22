/**
 * Quota period helpers shared by options page, background worker, and Vitest.
 * Must stay aligned with backend summarize/lib.ts periodStart() when an anchor exists.
 *
 * Dual export: CommonJS for Node/Vitest; globalThis + importScripts for MV3 worker / options.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestPeriodUtils = api;
  root.computePeriodStartDate = api.computePeriodStartDate;
  root.computePeriodStart = api.computePeriodStart;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const MS_PER_PERIOD = 30 * 24 * 60 * 60 * 1000;

  /**
   * Start of the current 30-day quota period as a Date (UTC midnight).
   * When anchorDate is missing, falls back to the 1st of the current UTC calendar month
   * (client display/usage query fallback — server uses "today" when profile has no anchor).
   *
   * @param {string|null|undefined} anchorDate YYYY-MM-DD
   * @param {Date} [today]
   * @returns {Date}
   */
  function computePeriodStartDate(anchorDate, today = new Date()) {
    if (!anchorDate) {
      return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    }
    const anchorMs = new Date(anchorDate + "T00:00:00Z").getTime();
    const todayMs = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    const elapsed = Math.max(0, todayMs - anchorMs);
    const periodsElapsed = Math.floor(elapsed / MS_PER_PERIOD);
    return new Date(anchorMs + periodsElapsed * MS_PER_PERIOD);
  }

  /**
   * Same as computePeriodStartDate, returned as YYYY-MM-DD for usage_counters_monthly queries.
   * @param {string|null|undefined} anchorDate
   * @param {Date} [today]
   * @returns {string}
   */
  function computePeriodStart(anchorDate, today = new Date()) {
    return computePeriodStartDate(anchorDate, today).toISOString().slice(0, 10);
  }

  return { computePeriodStartDate, computePeriodStart, MS_PER_PERIOD };
});
