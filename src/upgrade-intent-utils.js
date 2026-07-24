/**
 * Safari / options upgrade-intent helpers (pure).
 * Dual export: CommonJS for Node/Vitest; globalThis + importScripts for MV3 worker / pages.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestUpgradeIntentUtils = api;
  root.optionsPagePath = api.optionsPagePath;
  root.resolveUpgradeIntent = api.resolveUpgradeIntent;
  root.isSafariExtensionUrl = api.isSafariExtensionUrl;
  root.isSessionExpired = api.isSessionExpired;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /** Relative options path used with chrome.runtime.getURL / tabs.create fallback. */
  function optionsPagePath(upgrade = false) {
    return upgrade ? "src/options.html?upgrade=true" : "src/options.html";
  }

  /**
   * Decide whether options should auto-start upgrade, and which signals to clear.
   * Safari openOptionsPage cannot carry ?upgrade=true, so storage flag is required.
   */
  function resolveUpgradeIntent({ fromQuery = false, openUpgradeIntent = false } = {}) {
    const shouldUpgrade = !!fromQuery || !!openUpgradeIntent;
    return {
      shouldUpgrade,
      clearStorageFlag: !!openUpgradeIntent,
      clearQuery: !!fromQuery,
    };
  }

  function isSafariExtensionUrl(url) {
    return typeof url === "string" && url.startsWith("safari-web-extension://");
  }

  /**
   * Session expiry with buffer (ms). Missing expiresAt => not expired.
   * Default buffer matches background getSettings (5 minutes).
   */
  function isSessionExpired(expiresAt, nowMs = Date.now(), bufferMs = 300_000) {
    if (!expiresAt) return false;
    return expiresAt - bufferMs < nowMs;
  }

  return {
    optionsPagePath,
    resolveUpgradeIntent,
    isSafariExtensionUrl,
    isSessionExpired,
  };
});
