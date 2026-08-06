/**
 * Pure helpers for options/popup account-card visibility by tier.
 * Locks Free/Guest hiding of the Pro-only API key card and Guest hiding of
 * danger-zone / cache controls — high blast-radius product + permissions UI.
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for options.html script load.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestOptionsAccountUiUtils = api;
  root.resolveAccountCardVisibility = api.resolveAccountCardVisibility;
  root.resolveOptionsTouchSummarizeCopy = api.resolveOptionsTouchSummarizeCopy;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /**
   * @param {"guest"|"free"|"pro"} tier
   * @returns {{
   *   showStats: boolean,
   *   showApiCard: boolean,
   *   showSubManagement: boolean,
   *   showDangerZone: boolean,
   *   showDataCache: boolean,
   *   showUpgrade: boolean,
   *   showRefreshStatus: boolean,
   *   showActivePanel: boolean,
   *   showGuestStatus: boolean,
   *   badgeText: string,
   *   badgeClass: string,
   * }}
   */
  function resolveAccountCardVisibility(tier) {
    if (tier === "pro") {
      return {
        showStats: true,
        showApiCard: true,
        showSubManagement: true,
        showDangerZone: true,
        showDataCache: true,
        showUpgrade: false,
        showRefreshStatus: true,
        showActivePanel: true,
        showGuestStatus: false,
        badgeText: "Pro",
        badgeClass: "badge badge-success",
      };
    }

    if (tier === "free") {
      return {
        showStats: true,
        showApiCard: false,
        showSubManagement: false,
        showDangerZone: true,
        showDataCache: true,
        showUpgrade: true,
        showRefreshStatus: true,
        showActivePanel: true,
        showGuestStatus: false,
        badgeText: "Free",
        badgeClass: "badge badge-warning",
      };
    }

    // guest (default)
    return {
      showStats: false,
      showApiCard: false,
      showSubManagement: false,
      showDangerZone: false,
      showDataCache: false,
      // upgrade/refresh live inside the active panel; guests keep that panel hidden
      showUpgrade: false,
      showRefreshStatus: false,
      showActivePanel: false,
      showGuestStatus: true,
      badgeText: "Guest",
      badgeClass: "badge badge-info",
    };
  }

  /**
   * Options-page touch copy (British "summarise") — distinct from popup wording.
   */
  function resolveOptionsTouchSummarizeCopy({ touchSummarize = false } = {}) {
    if (!touchSummarize) return null;
    return {
      label: "Auto-summarise on tap",
      hint: "Automatically show summary when tapping legal links",
    };
  }

  return {
    resolveAccountCardVisibility,
    resolveOptionsTouchSummarizeCopy,
  };
});
