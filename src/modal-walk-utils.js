/**
 * Pure helpers for findModalContent strategies that go beyond selector lists:
 * Bootstrap/hash targets, aria-controls, parent-modal likeness, and the
 * querySelector strings / walk depth used for visible / hidden / content walks.
 *
 * Complements modal-discovery-utils (type-specific selectors, id base, scoring,
 * keyword-rich length gate) without duplicating those helpers.
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for classic content scripts.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestModalWalkUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /** Max parentElement hops when a legal control sits inside a modal/overlay. */
  const PARENT_MODAL_WALK_MAX_DEPTH = 10;

  /**
   * Visible-modal probe (strategy 5). Includes Bootstrap `.show` and dialogs
   * that are not explicitly `display: none`.
   */
  const VISIBLE_MODAL_SELECTOR =
    '.modal.show, .overlay.show, [role="dialog"], .modal:not([style*="display: none"])';

  /** Hidden / in-DOM modal probe (strategy 7b) — frameworks keep these mounted. */
  const HIDDEN_MODAL_SELECTOR =
    '.modal, .overlay, [role="dialog"], [class*="modal"], [class*="overlay"]';

  /** Last-resort content walk (strategy 6). */
  const CONTENT_WALK_SELECTOR = "section, div, article, main";

  /** Matches used by the parent-modal walk (strategy 8). */
  const PARENT_MODAL_MATCHES_SELECTOR = '.modal, .overlay, [role="dialog"]';

  /**
   * Bootstrap / hash modal trigger → CSS selector, or null.
   * Empty strings and non-hash targets are ignored (historical getAttribute path).
   */
  function resolveBootstrapModalSelector(dataTarget, dataBsTarget) {
    const modalTarget = dataTarget || dataBsTarget || "";
    if (modalTarget && String(modalTarget).startsWith("#")) {
      return String(modalTarget);
    }
    return null;
  }

  /**
   * aria-controls / aria-describedby → `#id` selector, or null.
   * Preserves historical truthiness (no trim): whitespace-only still builds `#…`.
   */
  function resolveAriaControlsSelector(ariaControls, ariaDescribedby) {
    const id = ariaControls || ariaDescribedby || "";
    if (!id) return null;
    return `#${id}`;
  }

  /** ClassName signal used when matches() is unavailable or false. */
  function isModalLikeClassName(className) {
    const c = String(className || "").toLowerCase();
    return c.includes("modal") || c.includes("overlay");
  }

  /**
   * Whether an ancestor should be treated as a modal/overlay container.
   * Historical content.js requires a truthy `el.matches` before class checks;
   * pass `hasMatchesMethod: false` to fail closed for non-Elements.
   * `matchesModalSelector` should reflect
   * `el.matches('.modal, .overlay, [role="dialog"]')` when DOM is available.
   */
  function isModalLikeElementSignals({
    className = "",
    matchesModalSelector = false,
    hasMatchesMethod = true,
  } = {}) {
    if (!hasMatchesMethod) return false;
    if (matchesModalSelector) return true;
    return isModalLikeClassName(className);
  }

  /**
   * Parent-modal walk over pre-extracted ancestor signals (no DOM required).
   * Returns the first modal-like ancestor whose lowercased text is keyword-rich
   * and longer than `minLength` (historical: `> 200`).
   *
   * @param {Array<{ className?: string, matchesModalSelector?: boolean, text?: string }>} ancestors
   * @param {string[]} keywords
   * @param {number} [minLength=200]
   * @returns {object|null} the matching ancestor signal object, or null
   */
  function resolveParentModalFromAncestorSignals(
    ancestors,
    keywords,
    minLength = 200
  ) {
    const list = Array.isArray(ancestors) ? ancestors : [];
    const depthLimit = PARENT_MODAL_WALK_MAX_DEPTH;
    const keys = Array.isArray(keywords) ? keywords : [];
    const limit =
      typeof minLength === "number" && Number.isFinite(minLength)
        ? minLength
        : 200;

    for (let i = 0; i < list.length && i < depthLimit; i++) {
      const node = list[i];
      if (!node) continue;
      if (
        !isModalLikeElementSignals({
          className: node.className,
          matchesModalSelector: !!node.matchesModalSelector,
          hasMatchesMethod: node.hasMatchesMethod !== false,
        })
      ) {
        continue;
      }
      const text = String(node.text || "").toLowerCase();
      if (text.length > limit && keys.some((k) => text.includes(String(k)))) {
        return node;
      }
    }
    return null;
  }

  return {
    PARENT_MODAL_WALK_MAX_DEPTH,
    VISIBLE_MODAL_SELECTOR,
    HIDDEN_MODAL_SELECTOR,
    CONTENT_WALK_SELECTOR,
    PARENT_MODAL_MATCHES_SELECTOR,
    resolveBootstrapModalSelector,
    resolveAriaControlsSelector,
    isModalLikeClassName,
    isModalLikeElementSignals,
    resolveParentModalFromAncestorSignals,
  };
});
