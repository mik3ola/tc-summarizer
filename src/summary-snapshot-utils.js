/**
 * Pure helpers for the content-script summary snapshot and storage-driven refresh.
 * Copy / footer-pref toggles / usage footer refresh all depend on keeping the last
 * rendered summary around while the popover is open — and clearing it on hide/error.
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for classic content scripts.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestSummarySnapshotUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /** Empty snapshot shape stored on `current` when nothing is copyable/re-renderable. */
  function emptySummarySnapshot() {
    return {
      lastSummary: null,
      lastSummaryUrl: null,
      lastSummaryFromCache: false,
    };
  }

  /**
   * Snapshot written after a successful renderSummary.
   * URL may be a string (including "") — only null/undefined means "no source".
   */
  function buildSummarySnapshot(summary, url, fromCache) {
    return {
      lastSummary: summary ?? null,
      lastSummaryUrl: url == null ? null : url,
      lastSummaryFromCache: !!fromCache,
    };
  }

  /**
   * True when the popover can re-render / copy from the stored snapshot.
   * Matches refreshSummaryIfVisible: summary truthy AND url not nullish.
   */
  function hasUsableSummarySnapshot(snapshot) {
    return !!(snapshot && snapshot.lastSummary && snapshot.lastSummaryUrl != null);
  }

  /**
   * Gate for preference-driven re-render of an already-visible summary.
   */
  function shouldRefreshSummaryIfVisible({
    contextValid = false,
    popoverVisible = false,
    snapshot = null,
  } = {}) {
    return !!(
      contextValid &&
      popoverVisible &&
      hasUsableSummarySnapshot(snapshot)
    );
  }

  /** chrome.storage.onChanged: only local area drives popover refresh. */
  function shouldHandleLocalStorageChange(areaName) {
    return areaName === "local";
  }

  /** Usage counter updates should refresh the visible footer stats row. */
  function shouldRefreshFooterOnUsageChange(changes) {
    return !!(
      changes &&
      Object.prototype.hasOwnProperty.call(changes, "monthlyUsage")
    );
  }

  /**
   * Preference storage updates: apply an object patch in-memory, or reload
   * from chrome when newValue is missing/non-object (cleared / corrupt).
   * @returns {{ action: "ignore"|"apply_patch"|"reload", patch?: object }}
   */
  function resolvePreferencesStorageChange(changes) {
    if (
      !changes ||
      !Object.prototype.hasOwnProperty.call(changes, "preferences")
    ) {
      return { action: "ignore" };
    }
    const next = changes.preferences && changes.preferences.newValue;
    if (next && typeof next === "object") {
      return { action: "apply_patch", patch: next };
    }
    return { action: "reload" };
  }

  return {
    emptySummarySnapshot,
    buildSummarySnapshot,
    hasUsableSummarySnapshot,
    shouldRefreshSummaryIfVisible,
    shouldHandleLocalStorageChange,
    shouldRefreshFooterOnUsageChange,
    resolvePreferencesStorageChange,
  };
});
