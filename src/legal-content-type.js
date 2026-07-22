/**
 * Classify legal link/button intent for modal content discovery.
 * Dual export: CommonJS for Node/Vitest; globalThis for classic content scripts.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestLegalContentType = api;
  root.getLegalContentType = api.getLegalContentType;
  root.getLegalContentTypeFromSignals = api.getLegalContentTypeFromSignals;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /**
   * @param {{ text?: string|null, id?: string|null }} signals
   * @returns {"privacy"|"terms"|"cookie"|"security"|"refund"|"legal"}
   */
  function getLegalContentTypeFromSignals(signals) {
    const text = (signals?.text || "").toLowerCase();
    const id = (signals?.id || "").toLowerCase();
    const combined = `${text} ${id}`;

    if (
      combined.includes("privacy") ||
      combined.includes("privacystatement") ||
      combined.includes("privacy-statement")
    ) {
      return "privacy";
    }
    if (
      combined.includes("terms") ||
      combined.includes("termsandconditions") ||
      combined.includes("conditions") ||
      combined.includes("eula")
    ) {
      return "terms";
    }
    if (combined.includes("cookie")) {
      return "cookie";
    }
    if (combined.includes("security")) {
      return "security";
    }
    if (
      combined.includes("refund") ||
      combined.includes("cancellation") ||
      combined.includes("return")
    ) {
      return "refund";
    }
    return "legal";
  }

  /**
   * DOM-friendly wrapper used by content.js.
   * @param {{ textContent?: string|null, getAttribute?: (name: string) => string|null }} element
   */
  function getLegalContentType(element) {
    if (!element) return "legal";
    const text = element.textContent || "";
    const id =
      typeof element.getAttribute === "function"
        ? element.getAttribute("id") || ""
        : "";
    return getLegalContentTypeFromSignals({ text, id });
  }

  return { getLegalContentType, getLegalContentTypeFromSignals };
});
