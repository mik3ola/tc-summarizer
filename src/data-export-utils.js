/**
 * Pure helpers for options-page data export.
 * Locks the chrome.storage.local key allowlist so exports never include
 * secrets (API keys, sessions, tokens) or account PII fields.
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for options.html script load.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestDataExportUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /**
   * Only cache + preferences are exported. Intentionally excludes
   * openaiApiKey, supabaseSession, refresh tokens, email, billing fields, etc.
   */
  const EXPORT_STORAGE_KEYS = Object.freeze(["summariesCache", "preferences"]);

  /** Keys that must never appear in an export payload (regression tripwire). */
  const FORBIDDEN_EXPORT_KEYS = Object.freeze([
    "openaiApiKey",
    "supabaseSession",
    "userEmail",
    "subscription",
    "subscriptionPlan",
    "monthlyUsage",
    "cycleAnchorDate",
    "currentPeriodEnd",
    "subscriptionAutoRenew",
    "subscriptionDowngradeScheduledFor",
  ]);

  /**
   * Build the JSON-serializable export object from a storage snapshot.
   * Missing keys become empty defaults matching historical export shape.
   */
  function buildExportPayload(storageSnapshot) {
    const snap =
      storageSnapshot && typeof storageSnapshot === "object"
        ? storageSnapshot
        : {};
    return {
      summariesCache:
        snap.summariesCache && typeof snap.summariesCache === "object"
          ? snap.summariesCache
          : {},
      preferences:
        snap.preferences && typeof snap.preferences === "object"
          ? snap.preferences
          : {},
    };
  }

  /**
   * Download filename. Injectable `nowMs` keeps tests deterministic.
   */
  function buildExportFilename(nowMs = Date.now()) {
    const n = Number(nowMs);
    const stamp = Number.isFinite(n) ? Math.floor(n) : 0;
    return `termsdigest-data-${stamp}.json`;
  }

  /** True when a key is on the forbidden list (case-sensitive historical keys). */
  function isForbiddenExportKey(key) {
    return FORBIDDEN_EXPORT_KEYS.includes(key);
  }

  return {
    EXPORT_STORAGE_KEYS,
    FORBIDDEN_EXPORT_KEYS,
    buildExportPayload,
    buildExportFilename,
    isForbiddenExportKey,
  };
});
