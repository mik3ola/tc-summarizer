/**
 * Pure summary API routing helpers (backend vs own OpenAI key).
 * Dual export: CommonJS for Node/Vitest; globalThis + importScripts for MV3 worker.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestSummaryAccessUtils = api;
  root.resolveSummaryApiAccess = api.resolveSummaryApiAccess;
  root.isQuotaExceededError = api.isQuotaExceededError;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /**
   * Decide how summarize requests may call APIs.
   * Free users must use the backend (quota enforced server-side).
   * Pro users try backend first, then may fall back to their own API key.
   */
  function resolveSummaryApiAccess({
    hasOwnApiKey = false,
    subscription = null,
    subscriptionPlan = null,
    hasBackendAccess = false,
  } = {}) {
    const isPro = subscription === "active" && subscriptionPlan === "pro";
    const shouldTryBackendFirst = !!hasBackendAccess;
    const canFallbackToOwnKey = isPro && !!hasOwnApiKey;
    return {
      isPro,
      shouldTryBackendFirst,
      canFallbackToOwnKey,
      canSummarize: shouldTryBackendFirst || canFallbackToOwnKey,
    };
  }

  /** Detect backend quota exhaustion so Pro users can fall back to own keys. */
  function isQuotaExceededError(error) {
    if (!error) return false;
    if (error.quotaExceeded === true || error.status === 429) return true;
    const msg = String(error.message || error);
    return msg.includes("Quota exceeded") || msg.includes("quota exceeded");
  }

  return {
    resolveSummaryApiAccess,
    isQuotaExceededError,
  };
});
