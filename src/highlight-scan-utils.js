/**
 * Pure helpers for legal-link highlight scanning / mutation rescan gates.
 * Complements highlight-glow-utils (#27) which owns reduced-motion / viewport
 * glow replay — this locks when SPA DOM mutations trigger a rescan and when
 * initLinkHighlighting may run (UI host + HTML document + autoHover).
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for classic content scripts.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestHighlightScanUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /** Same interactive selector used by hover/tap legal-link discovery. */
  const LEGAL_INTERACTIVE_SELECTOR = 'a, button, [role="link"], [role="button"]';

  /** Debounce for MutationObserver-driven rescans (historical content.js). */
  const HIGHLIGHT_SCAN_DEBOUNCE_MS = 100;

  /**
   * Whether an added-node signal may contain legal interactive controls.
   * Call sites gather matchesInteractive / hasInteractiveDescendant via
   * matches()/querySelector (cross-origin / text nodes stay false).
   *
   * @param {{
   *   isElement?: boolean,
   *   matchesInteractive?: boolean,
   *   hasInteractiveDescendant?: boolean
   * }|null|undefined} signal
   */
  function addedNodeMayNeedLegalScan(signal) {
    if (!signal || !signal.isElement) return false;
    return !!(signal.matchesInteractive || signal.hasInteractiveDescendant);
  }

  /**
   * Whether a batch of mutation records should trigger scanAndObserveLegalLinks.
   * Only childList additions that may introduce interactive nodes qualify.
   *
   * @param {Array<{
   *   type?: string,
   *   addedNodes?: Array<{
   *     isElement?: boolean,
   *     matchesInteractive?: boolean,
   *     hasInteractiveDescendant?: boolean
   *   }>
   * }>|null|undefined} mutations
   */
  function shouldRescanLegalLinksFromMutations(mutations) {
    if (!Array.isArray(mutations) || mutations.length === 0) return false;

    for (const mutation of mutations) {
      if (!mutation || mutation.type !== "childList") continue;
      const added = mutation.addedNodes;
      if (!Array.isArray(added) || added.length === 0) continue;
      for (const node of added) {
        if (addedNodeMayNeedLegalScan(node)) return true;
      }
    }
    return false;
  }

  /**
   * Gate for initLinkHighlighting — skip SVG/XML viewers and when autoHover is off.
   */
  function shouldInitLinkHighlighting({
    hasUiHost = false,
    hasDocumentHead = false,
    hasDocumentBody = false,
    autoHover = false,
  } = {}) {
    return !!(hasUiHost && hasDocumentHead && hasDocumentBody && autoHover);
  }

  /**
   * Whether a candidate should be passed to IntersectionObserver.
   * Skips already-tracked / already-classed nodes; legal-link filter is injectable.
   */
  function shouldObserveHighlightCandidate({
    alreadyTracked = false,
    hasHighlightClass = false,
    isLegalLink = false,
  } = {}) {
    if (alreadyTracked || hasHighlightClass) return false;
    return !!isLegalLink;
  }

  /**
   * Build a pure signal for an added DOM node (call site wraps try/catch).
   * @param {Element|Node|null|undefined} node
   * @param {string} [selector]
   */
  function buildAddedNodeScanSignal(node, selector = LEGAL_INTERACTIVE_SELECTOR) {
    if (!node || node.nodeType !== 1) {
      return {
        isElement: false,
        matchesInteractive: false,
        hasInteractiveDescendant: false,
      };
    }
    const matches =
      typeof node.matches === "function" ? !!node.matches(selector) : false;
    const hasDescendant =
      typeof node.querySelector === "function"
        ? !!node.querySelector(selector)
        : false;
    return {
      isElement: true,
      matchesInteractive: matches,
      hasInteractiveDescendant: hasDescendant,
    };
  }

  return {
    LEGAL_INTERACTIVE_SELECTOR,
    HIGHLIGHT_SCAN_DEBOUNCE_MS,
    addedNodeMayNeedLegalScan,
    shouldRescanLegalLinksFromMutations,
    shouldInitLinkHighlighting,
    shouldObserveHighlightCandidate,
    buildAddedNodeScanSignal,
  };
});
