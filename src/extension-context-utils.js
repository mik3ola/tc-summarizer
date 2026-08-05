/**
 * Extension context validity gate for content-script chrome.* access.
 * After reload/disable, chrome.runtime.id is missing and storage/messaging throws.
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for classic content scripts.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestExtensionContextUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /**
   * True when the extension runtime is still alive (chrome.runtime.id present).
   * Injectable chromeApi keeps unit tests deterministic without a real extension host.
   *
   * @param {object|null|undefined} [chromeApi]
   *   Defaults to global `chrome` when available.
   * @returns {boolean}
   */
  function isExtensionContextValid(chromeApi) {
    try {
      const api =
        chromeApi !== undefined
          ? chromeApi
          : typeof chrome !== "undefined"
            ? chrome
            : undefined;
      return !!api?.runtime?.id;
    } catch {
      return false;
    }
  }

  return { isExtensionContextValid };
});
