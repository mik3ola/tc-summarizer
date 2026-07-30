/**
 * Pure helpers for options-page usage remaining / reset messaging.
 * Threshold copy drives upgrade prompts; keep deterministic and plan-aware.
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for options page script tag.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestUsageHintUtils = api;
  root.getPlanQuota = api.getPlanQuota;
  root.computeRemainingSummaries = api.computeRemainingSummaries;
  root.formatResetClause = api.formatResetClause;
  root.buildUsageHint = api.buildUsageHint;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /** Inclusive monthly quota by plan (Free 5 / Pro 50 / Enterprise 5000). */
  function getPlanQuota(plan) {
    if (plan === "pro") return 50;
    if (plan === "enterprise") return 5000;
    return 5;
  }

  function computeRemainingSummaries(used, quota) {
    const u = Number(used) || 0;
    const q = Number(quota) || 0;
    return Math.max(0, q - u);
  }

  /**
   * Human-readable reset clause from nextReset Date and now.
   * @param {Date} nextReset
   * @param {Date} [now]
   * @param {(d: Date, opts: object) => string} [formatDate]
   */
  function formatResetClause(
    nextReset,
    now = new Date(),
    formatDate = (d, opts) => d.toLocaleDateString(undefined, opts)
  ) {
    const resetFmt = formatDate(nextReset, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const daysUntilReset = Math.ceil(
      (nextReset.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    );
    if (daysUntilReset <= 0) {
      return `Resets today (${resetFmt})`;
    }
    if (daysUntilReset === 1) {
      return `Resets tomorrow (${resetFmt})`;
    }
    return `Resets ${resetFmt} (in ${daysUntilReset} days)`;
  }

  /**
   * Options usage hint text + severity color token.
   * @returns {{ text: string, tone: "exhausted"|"low"|"ok" }}
   */
  function buildUsageHint({ remaining, resetClause }) {
    const left = Math.max(0, Number(remaining) || 0);
    const reset = resetClause || "";

    if (left === 0) {
      return {
        text: `You've used all your inclusive summaries this month. ${reset}. Upgrade for more!`,
        tone: "exhausted",
      };
    }
    if (left <= 2) {
      return {
        text: `Only ${left} ${left === 1 ? "summary" : "summaries"} left this month. ${reset}`,
        tone: "low",
      };
    }
    return {
      text: `${left} ${left === 1 ? "summary" : "summaries"} remaining this month. ${reset}`,
      tone: "ok",
    };
  }

  return {
    getPlanQuota,
    computeRemainingSummaries,
    formatResetClause,
    buildUsageHint,
  };
});
