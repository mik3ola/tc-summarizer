/**
 * Pure helpers for the popup "Full settings" open path and Safari/touch chrome.
 * Popup fallback differs from the background worker: openOptionsPage →
 * sendMessage(open_options) → window.open. If openOptionsPage throws, the
 * outer catch skips sendMessage and goes straight to window.open.
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for popup.html script load.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestPopupOpenSettingsUtils = api;
  root.resolvePopupOpenSettingsAction = api.resolvePopupOpenSettingsAction;
  root.resolvePopupOpenSettingsFailureFallback = api.resolvePopupOpenSettingsFailureFallback;
  root.shouldShowSafariPermissionTip = api.shouldShowSafariPermissionTip;
  root.resolvePopupTouchSummarizeCopy = api.resolvePopupTouchSummarizeCopy;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const OPTIONS_PAGE_PATH = "src/options.html";

  /**
   * Primary action for the popup Full-settings click (before any throw).
   * Prefer chrome.runtime.openOptionsPage; otherwise ask the background worker.
   */
  function resolvePopupOpenSettingsAction({ hasOpenOptionsPageApi = false } = {}) {
    if (hasOpenOptionsPageApi) {
      return { action: "open_options_page" };
    }
    return { action: "send_message", messageType: "open_options" };
  }

  /**
   * Fallback when the primary path throws (including openOptionsPage failures).
   * Intentionally does not retry sendMessage — matches historical popup.js.
   */
  function resolvePopupOpenSettingsFailureFallback() {
    return { action: "window_open", path: OPTIONS_PAGE_PATH };
  }

  /** Safari-only permission tip; Chrome extension URLs must stay hidden. */
  function shouldShowSafariPermissionTip(extensionUrl) {
    return (
      typeof extensionUrl === "string" &&
      extensionUrl.startsWith("safari-web-extension://")
    );
  }

  /**
   * Popup auto-summarize label/hint when the device is touch-first.
   * Keep British "summarise" on the options page; popup copy stays as-shipped.
   */
  function resolvePopupTouchSummarizeCopy({ touchSummarize = false } = {}) {
    if (!touchSummarize) return null;
    return {
      label: "Auto-summarize on tap",
      hint: "Show summary when tapping legal links",
    };
  }

  return {
    OPTIONS_PAGE_PATH,
    resolvePopupOpenSettingsAction,
    resolvePopupOpenSettingsFailureFallback,
    shouldShowSafariPermissionTip,
    resolvePopupTouchSummarizeCopy,
  };
});
