/**
 * Pure background service-worker message routing and summarize login gate.
 * Locks which `message.type` values the worker handles and the guest
 * "Please sign in" reject before any summarize API work.
 *
 * Dual export: CommonJS for Node/Vitest; globalThis + importScripts for MV3.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestBackgroundMessageUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const SIGN_IN_REQUIRED_ERROR = "Please sign in to use TermsDigest!";

  /**
   * Map an onMessage payload to a typed intent for the background worker.
   * Non-object / missing messages are ignored (matches historical early return).
   *
   * @returns {{
   *   intent:
   *     | "ignore"
   *     | "unknown"
   *     | "open_options"
   *     | "open_options_upgrade"
   *     | "fetch_html"
   *     | "get_preferences"
   *     | "summarize_text",
   *   type?: unknown,
   *   url?: unknown,
   *   text?: unknown
   * }}
   */
  function resolveBackgroundMessageIntent(message) {
    if (!message || typeof message !== "object") {
      return { intent: "ignore" };
    }

    switch (message.type) {
      case "open_options":
        return { intent: "open_options" };
      case "open_options_upgrade":
        return { intent: "open_options_upgrade" };
      case "fetch_html":
        return { intent: "fetch_html", url: message.url };
      case "get_preferences":
        return { intent: "get_preferences" };
      case "summarize_text":
        return {
          intent: "summarize_text",
          url: message.url,
          text: message.text,
        };
      default:
        return { intent: "unknown", type: message.type };
    }
  }

  /**
   * Guest gate for summarize_text: access_token required.
   * Runs after proactive session refresh / clear so guests cannot summarize.
   *
   * @returns {{ ok: true } | { ok: false, error: string }}
   */
  function resolveSummarizeLoginGate({ accessToken } = {}) {
    if (!accessToken) {
      return { ok: false, error: SIGN_IN_REQUIRED_ERROR };
    }
    return { ok: true };
  }

  return {
    SIGN_IN_REQUIRED_ERROR,
    resolveBackgroundMessageIntent,
    resolveSummarizeLoginGate,
  };
});
