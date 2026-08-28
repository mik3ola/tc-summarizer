/**
 * Pure helpers for findModalContent Strategy 9: same-origin iframe legal bodies.
 *
 * Complements modal-discovery-utils (#20) keyword-rich gates and modal-walk-utils
 * (#48) parent/Bootstrap walks — this owns iframe document access precedence and
 * which iframe body is accepted for in-page T&C summarization.
 *
 * Historical gate (content.js): lowercased body text length > 200 AND any KEYWORD
 * substring match. Does not trim before the length check (distinct from #20's
 * isSubstantialText which trims).
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for classic content scripts.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestIframeLegalUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /** Historical `text.length > 200` floor for iframe / hidden-modal legal bodies. */
  const IFRAME_LEGAL_MIN_LENGTH = 200;

  /**
   * Resolve the document used for same-origin iframe reads.
   * Locks `contentDocument || contentWindow.document` precedence from content.js.
   *
   * @param {Document|null|undefined} contentDocument
   * @param {Document|null|undefined} contentWindowDocument
   * @returns {Document|null}
   */
  function resolveIframeDocument(contentDocument, contentWindowDocument) {
    return contentDocument || contentWindowDocument || null;
  }

  /**
   * Whether lowercased (or already-lower) iframe body text is keyword-rich enough
   * to summarize. Matches historical: `KEYWORDS.some(...) && text.length > min`.
   * Does **not** trim — whitespace-only padding can satisfy the length floor.
   *
   * @param {string} bodyText
   * @param {string[]} keywords
   * @param {number} [minLength=200]
   * @returns {boolean}
   */
  function isAcceptableIframeLegalBodyText(
    bodyText,
    keywords,
    minLength = IFRAME_LEGAL_MIN_LENGTH
  ) {
    const text = String(bodyText || "").toLowerCase();
    const limit =
      typeof minLength === "number" && Number.isFinite(minLength)
        ? minLength
        : IFRAME_LEGAL_MIN_LENGTH;
    if (!(text.length > limit)) return false;
    const keys = Array.isArray(keywords) ? keywords : [];
    if (keys.length === 0) return false;
    return keys.some((k) => text.includes(String(k).toLowerCase()));
  }

  /**
   * Build a signal object from an iframe document read (or access failure).
   * Call sites catch cross-origin SecurityError and pass `accessError: true`.
   *
   * @param {{
   *   doc?: { body?: { textContent?: string }|null }|null,
   *   accessError?: boolean
   * }} [opts]
   * @returns {{ accessible: boolean, bodyText: string, body: unknown|null }}
   */
  function buildIframeBodySignal({ doc = null, accessError = false } = {}) {
    if (accessError || !doc) {
      return { accessible: false, bodyText: "", body: null };
    }
    const body = doc.body != null ? doc.body : null;
    // Historical: `(iframeDoc.body?.textContent || "")` — missing body → "".
    const bodyText = body?.textContent || "";
    return { accessible: true, bodyText, body };
  }

  /**
   * First same-origin iframe whose body text passes the legal-content gate.
   * Skips inaccessible frames (cross-origin / null document). Document order.
   *
   * @param {Array<{ accessible?: boolean, bodyText?: string, body?: unknown }>} frames
   * @param {string[]} keywords
   * @param {number} [minLength=200]
   * @returns {{ accessible: boolean, bodyText: string, body: unknown|null }|null}
   */
  function resolveSameOriginIframeLegalBody(
    frames,
    keywords,
    minLength = IFRAME_LEGAL_MIN_LENGTH
  ) {
    const list = Array.isArray(frames) ? frames : [];
    for (let i = 0; i < list.length; i++) {
      const frame = list[i];
      if (!frame || frame.accessible === false) continue;
      if (
        isAcceptableIframeLegalBodyText(frame.bodyText, keywords, minLength)
      ) {
        return frame;
      }
    }
    return null;
  }

  return {
    IFRAME_LEGAL_MIN_LENGTH,
    resolveIframeDocument,
    isAcceptableIframeLegalBodyText,
    buildIframeBodySignal,
    resolveSameOriginIframeLegalBody,
  };
});
