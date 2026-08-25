/**
 * Pure helpers for startHover session fields (cache/display URL + modal flag)
 * and in-page summarize loading labels. Complements summary-flow's
 * resolveHoverLinkAction (action branch) without duplicating it.
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for classic content scripts.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestHoverSessionUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const IN_PAGE_MODAL_LOADING_SUFFIX = " (in-page modal)";
  const IN_PAGE_CONTENT_LOADING_SUFFIX = " (in-page content)";

  /**
   * Map getUrlFromElement() results to startHover session fields.
   * Does not schedule timers or choose summarize handlers — only URL /
   * isModalContent patches that must stay aligned with each linkInfo.type.
   *
   * @returns {{
   *   ok: boolean,
   *   url?: string,
   *   setIsModalContent?: boolean,
   *   reason?: string
   * }}
   * - setIsModalContent is only present when the historical path assigns it
   *   (click-to-load → true). Other types leave the flag untouched.
   * - ok:false + reason "unresolvable_url" matches the early return after
   *   anchor/requestId/originalHref are already set for type "url".
   */
  function resolveHoverSessionFields(
    linkInfo,
    { pageHref = "", resolveAbsoluteUrl } = {}
  ) {
    if (!linkInfo || typeof linkInfo !== "object" || !linkInfo.type) {
      return { ok: false, reason: "invalid_link_info" };
    }

    const href = String(pageHref ?? "");

    switch (linkInfo.type) {
      case "modal":
        return {
          ok: true,
          url: href + String(linkInfo.value ?? ""),
        };
      case "modal-element":
        return { ok: true, url: href };
      case "click-to-load":
        return {
          ok: true,
          url: href,
          setIsModalContent: true,
        };
      case "url": {
        const abs =
          typeof resolveAbsoluteUrl === "function"
            ? resolveAbsoluteUrl(linkInfo.value)
            : null;
        if (!abs) {
          return { ok: false, reason: "unresolvable_url" };
        }
        return { ok: true, url: abs };
      }
      default:
        return { ok: false, reason: "unknown_type" };
    }
  }

  /**
   * Loading-label URL shown while summarizing Bootstrap-style modals.
   */
  function buildInPageModalLoadingUrl(pageHref) {
    return String(pageHref ?? "") + IN_PAGE_MODAL_LOADING_SUFFIX;
  }

  /**
   * Loading-label URL shown while summarizing discovered in-page content nodes.
   */
  function buildInPageContentLoadingUrl(pageHref) {
    return String(pageHref ?? "") + IN_PAGE_CONTENT_LOADING_SUFFIX;
  }

  return {
    IN_PAGE_MODAL_LOADING_SUFFIX,
    IN_PAGE_CONTENT_LOADING_SUFFIX,
    resolveHoverSessionFields,
    buildInPageModalLoadingUrl,
    buildInPageContentLoadingUrl,
  };
});
