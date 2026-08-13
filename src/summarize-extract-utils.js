/**
 * Pure helpers for summarize extract gates: fetch_html response shaping,
 * empty HTML → UNREADABLE_PAGE, and modal/in-page minimum text length.
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for classic content scripts.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestSummarizeExtractUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /** Minimum characters for modal / in-page content before summarizing. */
  const MIN_MODAL_TEXT_CHARS = 50;

  /**
   * Gate for the extension `fetch_html` message + HTTP result.
   * Matches summarizeLink checks that run before text extraction.
   *
   * @returns {{
   *   action: "throw"|"continue",
   *   errorMessage?: string,
   *   result?: object
   * }}
   */
  function resolveFetchHtmlOutcome(fetchRes) {
    if (!fetchRes?.ok) {
      return {
        action: "throw",
        errorMessage: fetchRes?.error || "Failed to fetch page HTML.",
      };
    }

    const result = fetchRes.result;
    if (!result?.ok) {
      return {
        action: "throw",
        errorMessage: `Fetch failed (${result?.status || "?"}). This site may block automated access.`,
      };
    }

    return { action: "continue", result };
  }

  /**
   * Empty / whitespace-only extract → UNREADABLE_PAGE (friendly info notice).
   *
   * @returns {{ action: "throw"|"continue", errorMessage?: string, text?: string }}
   */
  function resolveExtractedTextOutcome(extractedText) {
    const text = typeof extractedText === "string" ? extractedText : "";
    if (!text.trim()) {
      return { action: "throw", errorMessage: "UNREADABLE_PAGE" };
    }
    return { action: "continue", text };
  }

  /**
   * Combined fetch + extract decision (useful for unit tests / callers that
   * already have both). Prefer the split gates at the summarizeLink call site
   * so the mid-flight requestId cancellation check stays between them.
   */
  function resolveSummarizeLinkExtractOutcome({
    fetchRes = null,
    extractedText = "",
  } = {}) {
    const fetchOutcome = resolveFetchHtmlOutcome(fetchRes);
    if (fetchOutcome.action === "throw") return fetchOutcome;

    const textOutcome = resolveExtractedTextOutcome(extractedText);
    if (textOutcome.action === "throw") return textOutcome;

    return {
      action: "continue",
      text: textOutcome.text,
      finalUrl: fetchOutcome.result?.finalUrl || undefined,
    };
  }

  /**
   * Gate for summarizeModal / summarizeModalElement text length.
   * Selector-based modals and DOM-element modals share the 50-char floor but
   * keep distinct user-facing messages.
   *
   * @param {"modal"|"modal_element"} kind
   * @returns {{ ok: boolean, errorMessage?: string, text?: string }}
   */
  function resolveModalExtractOutcome(rawText, kind = "modal") {
    const text =
      typeof rawText === "string"
        ? rawText.replace(/\s+/g, " ").trim()
        : "";

    if (!text || text.length < MIN_MODAL_TEXT_CHARS) {
      return {
        ok: false,
        errorMessage:
          kind === "modal_element"
            ? "Content appears to be empty or has very little text."
            : "Modal appears to be empty or has very little content.",
      };
    }

    return { ok: true, text };
  }

  return {
    MIN_MODAL_TEXT_CHARS,
    resolveFetchHtmlOutcome,
    resolveExtractedTextOutcome,
    resolveSummarizeLinkExtractOutcome,
    resolveModalExtractOutcome,
  };
});
