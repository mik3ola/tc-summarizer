/**
 * Pure helpers for in-page modal / legal-content discovery.
 * Loaded before content.js in the content-script world, and importable from Vitest.
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for classic content scripts.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestModalDiscovery = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const GENERIC_LEGAL_SELECTORS = [
    ".legal-content",
    ".legal-statement",
    ".legal-notice",
    'section[class*="legal"]',
    'div[class*="legal"]'
  ];

  /**
   * Type-specific CSS selectors tried first when resolving modal content.
   * @param {"privacy"|"terms"|"cookie"|"security"|"refund"|"legal"|string} contentType
   * @returns {string[]}
   */
  function getTypeSpecificSelectors(contentType) {
    if (contentType === "privacy") {
      return [
        ".privacy-statement",
        ".privacy-policy",
        ".privacy-notice",
        ".privacy-content",
        'section[class*="privacy"]',
        'div[class*="privacy"]',
        '[id*="privacy"]',
        '[class*="privacystatement"]',
        '[class*="privacy-statement"]'
      ];
    }
    if (contentType === "terms") {
      return [
        ".terms-conditions",
        ".terms-and-conditions",
        ".terms-content",
        ".terms-statement",
        ".termsandconditions",
        ".terms-of-use",
        ".terms-of-service",
        'section[class*="terms"]',
        'div[class*="terms"]',
        '[id*="terms"]',
        '[class*="termsandconditions"]',
        '[class*="conditions"]'
      ];
    }
    if (contentType === "cookie") {
      return [
        ".cookie-policy",
        ".cookie-notice",
        ".cookie-content",
        ".cookies",
        'section[class*="cookie"]',
        'div[class*="cookie"]',
        '[id*="cookie"]'
      ];
    }
    if (contentType === "security") {
      return [
        ".security-policy",
        ".security-notice",
        ".security-content",
        ".security-statement",
        'section[class*="security"]',
        'div[class*="security"]',
        '[id*="security"]'
      ];
    }
    return [];
  }

  /**
   * Strip common link/button/footer prefixes/suffixes from a trigger element id
   * before building modal id/class candidates.
   */
  function normalizeModalIdBase(elementId) {
    if (!elementId) return "";
    return String(elementId)
      .replace(/-link$/, "")
      .replace(/-button$/, "")
      .replace(/^footer-/, "")
      .replace(/^welcome-overlay-/, "");
  }

  /**
   * @param {string} baseId
   * @returns {string[]}
   */
  function buildIdBasedModalSelectors(baseId) {
    if (!baseId) return [];
    return [
      `#${baseId}-modal`,
      `#${baseId}-overlay`,
      `#${baseId}-dialog`,
      `#${baseId}-content`,
      `#${baseId}`,
      `.${baseId}`,
      `[class*="${baseId}"]`,
      `section.${baseId}`
    ];
  }

  /**
   * Whether a visible modal's text/class/id matches the intended content type.
   */
  function visibleModalMatchesContentType(contentType, signals) {
    const text = (signals?.text || "").toLowerCase();
    const className = (signals?.className || "").toLowerCase();
    const id = (signals?.id || "").toLowerCase();

    if (contentType === "privacy") {
      return (
        text.includes("privacy") ||
        className.includes("privacy") ||
        id.includes("privacy")
      );
    }
    if (contentType === "terms") {
      return (
        text.includes("terms") || className.includes("terms") || id.includes("terms")
      );
    }
    return false;
  }

  /**
   * Score a candidate element for last-resort DOM search (strategy 6).
   * Higher is better; 0 means no match.
   */
  function scoreElementForContentType(contentType, signals) {
    const text = (signals?.text || "").toLowerCase();
    const className = (signals?.className || "").toLowerCase();
    const id = (signals?.id || "").toLowerCase();

    let score = 0;
    if (contentType === "privacy") {
      if (className.includes("privacy") || id.includes("privacy")) score += 10;
      if (text.includes("privacy policy") || text.includes("privacy notice")) score += 5;
    } else if (contentType === "terms") {
      if (className.includes("terms") || id.includes("terms")) score += 10;
      if (text.includes("terms of use") || text.includes("terms and conditions")) score += 5;
    }
    return score;
  }

  function isSubstantialText(text, minLength) {
    return String(text || "").trim().length > minLength;
  }

  /**
   * Hidden-modal / iframe / parent-modal gate: keyword hit + substantial length.
   */
  function hasKeywordRichText(text, keywords, minLength) {
    const lower = String(text || "").toLowerCase();
    if (!isSubstantialText(lower, minLength)) return false;
    if (!Array.isArray(keywords) || keywords.length === 0) return false;
    return keywords.some((k) => lower.includes(String(k).toLowerCase()));
  }

  function getGenericLegalSelectors() {
    return GENERIC_LEGAL_SELECTORS.slice();
  }

  return {
    getTypeSpecificSelectors,
    normalizeModalIdBase,
    buildIdBasedModalSelectors,
    visibleModalMatchesContentType,
    scoreElementForContentType,
    isSubstantialText,
    hasKeywordRichText,
    getGenericLegalSelectors
  };
});
