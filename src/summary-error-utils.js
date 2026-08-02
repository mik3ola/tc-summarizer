/**
 * Pure helpers for summary popover error classification.
 * Locks which CTA/path users see for quota, auth, unreadable pages,
 * and extension-context failures (high regression risk on Safari/Chrome).
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for classic content scripts.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestSummaryErrorUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /**
   * True when chrome.runtime / messaging failed because the extension was reloaded.
   */
  function isContextInvalidatedMessage(message) {
    const msg = String(message ?? "").toLowerCase();
    return (
      msg.includes("context invalidated") ||
      msg.includes("message port closed") ||
      msg.includes("reading 'get'") ||
      msg.includes("reading 'sendmessage'") ||
      msg.includes("reading 'runtime'")
    );
  }

  /**
   * Pro entitlement for error UI CTAs.
   * Matches content.js: plan==="pro" alone still counts (flexible UI policy).
   */
  function isProForErrorUi(subscription, subscriptionPlan) {
    return (
      (subscription === "active" && subscriptionPlan === "pro") ||
      subscriptionPlan === "pro"
    );
  }

  function hasUsableOpenAIKey(key) {
    return !!(key && String(key).trim().length > 0);
  }

  /**
   * Classify a summarize failure into UI fields + which button set to show.
   *
   * @param {{
   *   errMsg?: string|null,
   *   isProUser?: boolean,
   *   hasOpenAIKey?: boolean,
   * }} opts
   * @returns {{
   *   suppress: boolean,
   *   displayMsg: string,
   *   errorIcon: string,
   *   headerTitle: string,
   *   showUpgradeButton: boolean,
   *   showRefreshButton: boolean,
   *   isSignInIssue: boolean,
   *   isProQuotaExceeded: boolean,
   *   isInfoNotice: boolean,
   *   buttonSet: 'suppress'|'refresh'|'pro_quota'|'upgrade'|'sign_in'|'info'|'generic',
   * }}
   */
  function classifySummaryErrorUi({
    errMsg = null,
    isProUser = false,
    hasOpenAIKey = false,
  } = {}) {
    const msg = errMsg || "Unknown error";

    let displayMsg = msg;
    let errorIcon = "⚠️";
    let headerTitle = "Summary unavailable";
    let showUpgradeButton = false;
    let showRefreshButton = false;
    let isSignInIssue = false;
    let isProQuotaExceeded = false;
    let isInfoNotice = false;
    let suppress = false;

    if (msg === "UNREADABLE_PAGE" || msg.includes("Could not extract readable text")) {
      displayMsg =
        "We couldn't read this page automatically. You can still open it to read it yourself.";
      errorIcon = "ℹ️";
      headerTitle = "Nothing to summarise";
      isInfoNotice = true;
    } else if (isContextInvalidatedMessage(msg)) {
      displayMsg = "Extension needs a page refresh to continue";
      errorIcon = "⚠️";
      headerTitle = "Summary unavailable";
      showRefreshButton = true;
    } else if (
      msg.includes("No API access") ||
      msg.includes("Please login") ||
      msg.includes("sign in")
    ) {
      displayMsg = "Please sign in to continue";
      errorIcon = "🔒";
      headerTitle = "Sign in required";
      isSignInIssue = true;
    } else if (msg.includes("Quota exceeded") || msg.includes("quotaExceeded")) {
      if (isProUser && hasOpenAIKey) {
        // Pro + own key should already have fallen back; suppress the popover error.
        suppress = true;
      } else if (isProUser) {
        isProQuotaExceeded = true;
        displayMsg =
          "Monthly limit reached. Add your OpenAI API key for unlimited summaries, or contact support.";
        errorIcon = "⚠️";
        headerTitle = "Usage limit reached";
      } else {
        displayMsg = "You've hit your usage limit";
        errorIcon = "⚠️";
        headerTitle = "Usage limit reached";
        showUpgradeButton = true;
      }
    } else if (
      msg.includes("Session expired") ||
      msg.includes("Invalid JWT") ||
      msg.includes("401") ||
      msg.includes("Unauthorized")
    ) {
      displayMsg = "Session expired";
      errorIcon = "🔒";
      headerTitle = "Sign in required";
      isSignInIssue = true;
    }

    let buttonSet = "generic";
    if (suppress) buttonSet = "suppress";
    else if (showRefreshButton) buttonSet = "refresh";
    else if (isProQuotaExceeded) buttonSet = "pro_quota";
    else if (showUpgradeButton) buttonSet = "upgrade";
    else if (isSignInIssue) buttonSet = "sign_in";
    else if (isInfoNotice) buttonSet = "info";

    return {
      suppress,
      displayMsg,
      errorIcon,
      headerTitle,
      showUpgradeButton,
      showRefreshButton,
      isSignInIssue,
      isProQuotaExceeded,
      isInfoNotice,
      buttonSet,
    };
  }

  return {
    isContextInvalidatedMessage,
    isProForErrorUi,
    hasUsableOpenAIKey,
    classifySummaryErrorUi,
  };
});
