/**
 * Pure helpers for popover "View page" / "View full content" navigation.
 * open-link (error CTAs) and view-source (summary footer) intentionally diverge:
 * modal summaries must re-click the in-page trigger; URL summaries open the
 * stored original href (not the internal cache key).
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for classic content scripts.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestSourceNavigationUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /**
   * Resolve the absolute original href stored on hover start for later navigation.
   * Empty / missing attributes yield null (call sites fall back to anchor click).
   *
   * @param {{ getAttribute?: (name: string) => string | null } | null} element
   * @param {(href: string) => string} toAbsoluteUrl
   * @returns {string | null}
   */
  function resolveOriginalHrefFromElement(element, toAbsoluteUrl) {
    if (!element || typeof element.getAttribute !== "function") return null;
    if (typeof toAbsoluteUrl !== "function") return null;
    const originalHref =
      element.getAttribute("href") || element.getAttribute("data-href") || "";
    if (!originalHref) return null;
    return toAbsoluteUrl(originalHref);
  }

  /**
   * Error-CTA "View page" (`data-action="open-link"`):
   * prefer clicking the live anchor; else window.open(originalHref).
   *
   * @returns {{ method: "click_anchor"|"open_href"|"noop", href?: string }}
   */
  function resolveOpenOriginalLinkAction({
    hasAnchor = false,
    originalHref = null,
  } = {}) {
    if (hasAnchor) return { method: "click_anchor" };
    if (originalHref) return { method: "open_href", href: originalHref };
    return { method: "noop" };
  }

  /**
   * Summary footer "View full content" (`data-action="view-source"`):
   * modal content → click anchor; else open originalHref; else click anchor.
   *
   * @returns {{ method: "click_anchor"|"open_href"|"noop", href?: string }}
   */
  function resolveViewSourceAction({
    isModalContent = false,
    hasAnchor = false,
    originalHref = null,
  } = {}) {
    if (isModalContent && hasAnchor) return { method: "click_anchor" };
    if (originalHref) return { method: "open_href", href: originalHref };
    if (hasAnchor) return { method: "click_anchor" };
    return { method: "noop" };
  }

  return {
    resolveOriginalHrefFromElement,
    resolveOpenOriginalLinkAction,
    resolveViewSourceAction,
  };
});
