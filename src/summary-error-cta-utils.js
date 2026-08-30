/**
 * Pure helpers that map summary-error buttonSet → concrete CTA descriptors.
 * Complements summary-error-utils (#28) classification: that module decides
 * which buttonSet to show; this locks the data-action / label / primary
 * chrome users actually click (quota, auth, refresh, unreadable).
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for classic content scripts.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestSummaryErrorCtaUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /**
   * @typedef {{ action: string, label: string, primary: boolean }} SummaryErrorCta
   */

  /**
   * Resolve CTA buttons for a classified error buttonSet.
   * `suppress` yields an empty list (caller returns early / hides popover error).
   *
   * @param {string|null|undefined} buttonSet
   * @returns {SummaryErrorCta[]}
   */
  function resolveSummaryErrorCtas(buttonSet) {
    switch (buttonSet) {
      case "suppress":
        return [];
      case "refresh":
        return [
          { action: "refresh-page", label: "Refresh page", primary: false },
          { action: "open-link", label: "View page", primary: false },
        ];
      case "pro_quota":
        return [
          { action: "open-options", label: "Add API Key", primary: true },
          { action: "open-support", label: "Contact Support", primary: false },
        ];
      case "upgrade":
        return [
          { action: "upgrade-to-pro", label: "Upgrade to Pro", primary: true },
          { action: "open-options", label: "Open Options", primary: false },
        ];
      case "sign_in":
        return [
          { action: "open-options", label: "Sign in", primary: false },
          { action: "open-link", label: "View page", primary: false },
        ];
      case "info":
        return [{ action: "open-link", label: "View page", primary: false }];
      case "generic":
      default:
        return [
          { action: "open-options", label: "Open Options", primary: false },
          { action: "open-link", label: "View page", primary: false },
        ];
    }
  }

  /**
   * Render CTA descriptors to the historical popover button markup.
   * Labels/actions are trusted constants from resolveSummaryErrorCtas — not user input.
   *
   * @param {SummaryErrorCta[]} ctas
   * @returns {string}
   */
  function buildSummaryErrorButtonsHtml(ctas) {
    const list = Array.isArray(ctas) ? ctas : [];
    if (!list.length) return "";
    const buttons = list
      .map((cta) => {
        const primaryClass = cta?.primary ? ' class="primary"' : "";
        const action = String(cta?.action || "");
        const label = String(cta?.label || "");
        return `      <button${primaryClass} data-action="${action}">${label}</button>`;
      })
      .join("\n");
    return `\n${buttons}\n    `;
  }

  /**
   * Derive buttonSet from the historical boolean flags when classification
   * helpers are unavailable (inline fallback path).
   */
  function resolveButtonSetFromFlags({
    suppress = false,
    showRefreshButton = false,
    isProQuotaExceeded = false,
    showUpgradeButton = false,
    isSignInIssue = false,
    isInfoNotice = false,
  } = {}) {
    if (suppress) return "suppress";
    if (showRefreshButton) return "refresh";
    if (isProQuotaExceeded) return "pro_quota";
    if (showUpgradeButton) return "upgrade";
    if (isSignInIssue) return "sign_in";
    if (isInfoNotice) return "info";
    return "generic";
  }

  return {
    resolveSummaryErrorCtas,
    buildSummaryErrorButtonsHtml,
    resolveButtonSetFromFlags,
  };
});
