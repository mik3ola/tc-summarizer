/**
 * Pure helpers for legal-link event targeting and getUrlFromElement classification.
 * Complements summary-flow (#29) resolveHoverLinkAction and hover-session (#46)
 * session URL patches — this owns attribute → navigation-type mapping and the
 * closest() interactive selector used by hover/tap handlers.
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for classic content scripts.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestElementNavigationUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /** Historical closest() selector for hover / tap legal-link detection. */
  const LEGAL_INTERACTIVE_SELECTOR =
    'a, button, [role="link"], [role="button"]';

  /**
   * Resolve the interactive legal control under an event target.
   * Inject `isLikelyLegalLink` so Vitest can stub without DOM keyword matching.
   *
   * @param {{ closest?: (sel: string) => Element | null } | null | undefined} target
   * @param {(el: Element) => boolean} isLikelyLegalLink
   * @returns {Element | null}
   */
  function findLegalInteractiveFromTarget(target, isLikelyLegalLink) {
    if (!target || typeof target.closest !== "function") return null;
    if (typeof isLikelyLegalLink !== "function") return null;
    const el = target.closest(LEGAL_INTERACTIVE_SELECTOR);
    if (!el || !isLikelyLegalLink(el)) return null;
    return el;
  }

  /**
   * Classify navigation from getUrlFromElement attribute signals.
   * Does not touch the DOM — callers pass `modalContentFound` after findModalContent.
   * For `modal-element` / `click-to-load`, `value` is omitted; call sites attach
   * the modal node or the trigger element.
   *
   * @param {{
   *   href?: string | null,
   *   dataHref?: string | null,
   *   dataUrl?: string | null,
   *   dataLink?: string | null,
   *   dataTarget?: string | null,
   *   dataBsTarget?: string | null,
   *   modalContentFound?: boolean
   * }} [attrs]
   * @returns {{ type: "url"|"modal"|"modal-element"|"click-to-load", value?: string } | null}
   */
  function classifyElementNavigation({
    href = "",
    dataHref = "",
    dataUrl = "",
    dataLink = "",
    dataTarget = "",
    dataBsTarget = "",
    modalContentFound = false,
  } = {}) {
    const linkHref = String(href || dataHref || "");
    if (
      linkHref &&
      !linkHref.startsWith("#") &&
      !linkHref.startsWith("javascript:")
    ) {
      return { type: "url", value: linkHref };
    }

    const dataUrlValue = String(dataUrl || dataLink || "");
    if (dataUrlValue) {
      return { type: "url", value: dataUrlValue };
    }

    const modalTarget = String(dataTarget || dataBsTarget || "");
    if (modalTarget && modalTarget.startsWith("#")) {
      return { type: "modal", value: modalTarget };
    }

    // Historical: only javascript:, empty, or exact "#" enter the modal/click path.
    // Fragment hrefs like "#terms-section" fall through to null (no navigation type).
    if (
      linkHref.startsWith("javascript:") ||
      !linkHref ||
      linkHref === "#"
    ) {
      if (modalContentFound) {
        return { type: "modal-element" };
      }
      return { type: "click-to-load" };
    }

    return null;
  }

  return {
    LEGAL_INTERACTIVE_SELECTOR,
    findLegalInteractiveFromTarget,
    classifyElementNavigation,
  };
});
