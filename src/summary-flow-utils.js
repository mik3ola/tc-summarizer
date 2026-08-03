/**
 * Pure helpers for summary request lifecycle, link routing, confidence badges,
 * and request-size clamping. High regression risk across Safari/Chrome hover+tap.
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for classic content scripts / MV3.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestSummaryFlowUtils = api;
  root.DEFAULT_MAX_TEXT_CHARS = api.DEFAULT_MAX_TEXT_CHARS;
  root.isCurrentSummaryRequest = api.isCurrentSummaryRequest;
  root.resolveDynamicNavigationOutcome = api.resolveDynamicNavigationOutcome;
  root.resolveHoverLinkAction = api.resolveHoverLinkAction;
  root.getConfidenceTooltip = api.getConfidenceTooltip;
  root.getConfidenceBadgeClass = api.getConfidenceBadgeClass;
  root.truncateDisplayUrl = api.truncateDisplayUrl;
  root.clampTextForSummarize = api.clampTextForSummarize;
  root.resolveSummarizeAuthGate = api.resolveSummarizeAuthGate;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /** Default max chars sent to summarize APIs (keep request size reasonable). */
  const DEFAULT_MAX_TEXT_CHARS = 45_000;

  /**
   * True when an async summarize result still belongs to the active hover/tap.
   * Closing the popover or starting another hover bumps currentRequestId.
   */
  function isCurrentSummaryRequest(currentRequestId, requestId) {
    return currentRequestId === requestId;
  }

  /**
   * After attribute-only navigation resolves to "dynamic", decide modal-element
   * vs click-to-load based on whether modal content was already in the DOM.
   */
  function resolveDynamicNavigationOutcome(modalContent) {
    if (modalContent) {
      return { type: "modal-element", value: modalContent };
    }
    return { type: "click-to-load", value: null };
  }

  /**
   * Map getUrlFromElement() results to the startHover action branch.
   * @returns {{ action: "ignore"|"summarize_modal"|"summarize_modal_element"|"click_to_load"|"summarize_url" }}
   */
  function resolveHoverLinkAction(linkInfo) {
    if (!linkInfo || typeof linkInfo !== "object" || !linkInfo.type) {
      return { action: "ignore" };
    }
    switch (linkInfo.type) {
      case "modal":
        return { action: "summarize_modal" };
      case "modal-element":
        return { action: "summarize_modal_element" };
      case "click-to-load":
        return { action: "click_to_load" };
      case "url":
        return { action: "summarize_url" };
      default:
        return { action: "ignore" };
    }
  }

  function getConfidenceTooltip(confidence) {
    const tips = {
      high: "High confidence: Clear, well-structured legal text found",
      medium: "Medium confidence: Reasonable summary but some parts may be unclear",
      low: "Low confidence: AI struggled with this page — verify manually",
    };
    return tips[confidence] || tips.medium;
  }

  function getConfidenceBadgeClass(confidence) {
    if (confidence === "high") return "badge-high";
    if (confidence === "low") return "badge-low";
    return "badge-medium";
  }

  function truncateDisplayUrl(url, maxLen = 50) {
    const s = String(url ?? "");
    if (s.length <= maxLen) return s;
    return s.slice(0, Math.max(0, maxLen - 3)) + "…";
  }

  /**
   * Clamp page text before summarize API calls.
   * Returns empty string for non-string / whitespace-only input after clamp.
   */
  function clampTextForSummarize(rawText, maxChars = DEFAULT_MAX_TEXT_CHARS) {
    const text = typeof rawText === "string" ? rawText : "";
    const limit =
      typeof maxChars === "number" && Number.isFinite(maxChars) && maxChars > 0
        ? maxChars
        : DEFAULT_MAX_TEXT_CHARS;
    const clamped = text.length > limit ? text.slice(0, limit) : text;
    return clamped.trim() ? clamped : "";
  }

  /**
   * Guest must sign in before summarize. Pure gate used by the background worker.
   */
  function resolveSummarizeAuthGate({ hasAccessToken = false } = {}) {
    if (!hasAccessToken) {
      return {
        allowed: false,
        error: "Please sign in to use TermsDigest!",
      };
    }
    return { allowed: true, error: null };
  }

  return {
    DEFAULT_MAX_TEXT_CHARS,
    isCurrentSummaryRequest,
    resolveDynamicNavigationOutcome,
    resolveHoverLinkAction,
    getConfidenceTooltip,
    getConfidenceBadgeClass,
    truncateDisplayUrl,
    clampTextForSummarize,
    resolveSummarizeAuthGate,
  };
});
