/**
 * Pure helpers for content-script usage-footer refresh context.
 * When monthlyUsage updates, refreshFooterIfVisible must know which URL and
 * whether the open popover is a summary view (copy + quick prefs) vs loading/error.
 * Distinct from #25 footer quota/minutes math and #38 "should refresh?" gates.
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for classic content scripts.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestFooterRefreshContextUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /**
   * Resolve URL + summary-view flag from popover DOM signals gathered at the call site.
   * Prefer view-source href (summary pages), then fall back to hover session URL.
   *
   * @param {{
   *   viewSourceHref?: string | null,
   *   fallbackUrl?: string | null,
   *   hasSummaryContent?: boolean
   * }} [signals]
   * @returns {{ currentUrl: string | null, isSummaryView: boolean }}
   */
  function resolveFooterRefreshContext({
    viewSourceHref = null,
    fallbackUrl = null,
    hasSummaryContent = false,
  } = {}) {
    const fromViewSource =
      typeof viewSourceHref === "string" && viewSourceHref
        ? viewSourceHref
        : null;
    const fromFallback =
      typeof fallbackUrl === "string" && fallbackUrl ? fallbackUrl : null;
    return {
      currentUrl: fromViewSource || fromFallback || null,
      isSummaryView: !!hasSummaryContent,
    };
  }

  return {
    resolveFooterRefreshContext,
  };
});
