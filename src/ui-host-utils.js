/**
 * Pure helpers for deciding whether the content script may inject its UI host.
 * Standalone SVG / XML / image viewers lack a normal HTML document tree;
 * injecting there historically crashed the script (v0.2.1 fix).
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for classic content scripts.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestUiHostUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /**
   * True when `doc` looks like an HTML document safe for a fixed UI host.
   * HTMLElement ctor is injectable so Vitest can exercise instanceof without jsdom.
   *
   * @param {Document|object|null|undefined} doc
   * @param {Function|null|undefined} [HTMLElementCtor]
   *   Defaults to global HTMLElement when available.
   */
  function canInjectUiHost(doc, HTMLElementCtor) {
    try {
      const Ctor =
        HTMLElementCtor !== undefined
          ? HTMLElementCtor
          : typeof HTMLElement !== "undefined"
            ? HTMLElement
            : null;
      if (!doc?.body) return false;
      if (!Ctor) return false;
      return doc.documentElement instanceof Ctor;
    } catch {
      return false;
    }
  }

  /**
   * Harmless stub so event listeners can still attach when UI injection is skipped.
   * Downstream work must gate on `host` being non-null.
   */
  function buildUiHostStub() {
    const noop = () => {};
    return {
      host: null,
      shadow: null,
      popover: { addEventListener: noop, removeEventListener: noop },
    };
  }

  return {
    canInjectUiHost,
    buildUiHostStub,
  };
});
