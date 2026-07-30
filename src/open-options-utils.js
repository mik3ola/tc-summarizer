/**
 * Pure helpers for opening the options page (Chrome + Safari fallback).
 * Safari openOptionsPage cannot carry query strings; upgrade intent is persisted
 * separately. When openOptionsPage is missing or fails, fall back to tabs.create.
 *
 * Dual export: CommonJS for Node/Vitest; globalThis + importScripts for MV3 worker.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestOpenOptionsUtils = api;
  root.shouldPersistUpgradeIntent = api.shouldPersistUpgradeIntent;
  root.optionsPageRelativePath = api.optionsPageRelativePath;
  root.resolveOpenOptionsFallback = api.resolveOpenOptionsFallback;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /** Whether to write openUpgradeIntent before opening options. */
  function shouldPersistUpgradeIntent(upgrade) {
    return !!upgrade;
  }

  /**
   * Relative options path for chrome.runtime.getURL / tabs.create.
   * Keep aligned with upgrade deep-link handling on the options page.
   */
  function optionsPageRelativePath(upgrade = false) {
    return upgrade ? "src/options.html?upgrade=true" : "src/options.html";
  }

  /**
   * Decide what to do after optionally attempting chrome.runtime.openOptionsPage.
   *
   * @param {{
   *   hasOpenOptionsPageApi?: boolean,
   *   openOptionsPageSucceeded?: boolean|null,
   *   hasTabsCreate?: boolean,
   *   upgrade?: boolean,
   * }} [opts]
   *   - openOptionsPageSucceeded: null = not attempted; true/false = attempt result
   * @returns {{ action: "done"|"tabs_create"|"unavailable", path?: string }}
   */
  function resolveOpenOptionsFallback({
    hasOpenOptionsPageApi = false,
    openOptionsPageSucceeded = null,
    hasTabsCreate = false,
    upgrade = false,
  } = {}) {
    if (hasOpenOptionsPageApi && openOptionsPageSucceeded === true) {
      return { action: "done" };
    }

    // Missing API, failed attempt, or explicit skip → tabs fallback when available
    if (hasTabsCreate) {
      return {
        action: "tabs_create",
        path: optionsPageRelativePath(upgrade),
      };
    }

    return { action: "unavailable" };
  }

  return {
    shouldPersistUpgradeIntent,
    optionsPageRelativePath,
    resolveOpenOptionsFallback,
  };
});
