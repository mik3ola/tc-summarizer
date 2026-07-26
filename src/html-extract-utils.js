/**
 * Pure HTML / navigation helpers for the content script.
 * Dual export: CommonJS for Node/Vitest; globalThis for classic content scripts.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestHtmlExtractUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /**
   * Whether the content script may inject UI into this document.
   * Standalone SVG/XML viewers have a non-HTMLElement root and must be skipped
   * (injecting a host div there crashes).
   */
  function canInjectPageUi(doc, HTMLElementCtor) {
    if (!doc?.body || !doc.documentElement) return false;
    const Ctor =
      HTMLElementCtor ||
      (typeof HTMLElement !== "undefined" ? HTMLElement : null);
    if (!Ctor) return true;
    return doc.documentElement instanceof Ctor;
  }

  /** Resolve relative hrefs against a page base URL. */
  function toAbsoluteUrl(href, baseHref) {
    try {
      return new URL(href, baseHref).toString();
    } catch {
      return null;
    }
  }

  /**
   * Attribute-only navigation resolution for legal links/buttons.
   * Dynamic modal discovery / click-to-load is left to the caller when type is "dynamic".
   */
  function resolveElementNavigation({
    href = "",
    dataHref = "",
    dataUrl = "",
    dataLink = "",
    dataTarget = "",
    dataBsTarget = "",
  } = {}) {
    const resolvedHref = href || dataHref || "";
    if (
      resolvedHref &&
      !resolvedHref.startsWith("#") &&
      !resolvedHref.startsWith("javascript:")
    ) {
      return { type: "url", value: resolvedHref };
    }

    const dataUrlVal = dataUrl || dataLink || "";
    if (dataUrlVal) return { type: "url", value: dataUrlVal };

    const modalTarget = dataTarget || dataBsTarget || "";
    if (modalTarget && modalTarget.startsWith("#")) {
      return { type: "modal", value: modalTarget };
    }

    if (resolvedHref.startsWith("javascript:") || !resolvedHref || resolvedHref === "#") {
      return { type: "dynamic", value: null };
    }

    return null;
  }

  function cleanExtractedText(rawText) {
    return String(rawText || "")
      .replace(/\u00a0/g, " ")
      .replace(/[\t ]+/g, " ")
      .replace(/ *\n */g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function collectContentCandidates(doc) {
    if (!doc?.querySelector) return [];
    return [
      doc.querySelector("main"),
      doc.querySelector('[role="main"]'),
      doc.querySelector("article"),
      doc.querySelector(".content"),
      doc.querySelector("#content"),
      doc.querySelector(".main-content"),
      doc.querySelector(".page-content"),
      doc.querySelector(".entry-content"),
      doc.querySelector(".post-content"),
      doc.body,
    ].filter(Boolean);
  }

  function pickBestCandidateText(candidates) {
    let bestText = "";
    for (const candidate of candidates || []) {
      const cleaned = cleanExtractedText(candidate?.textContent || "");
      if (cleaned.length > bestText.length) bestText = cleaned;
    }
    return bestText;
  }

  function stripNonContentElements(doc) {
    if (!doc?.querySelectorAll) return;
    doc.querySelectorAll("script, style, noscript, svg, canvas").forEach((el) => {
      if (typeof el.remove === "function") el.remove();
    });
  }

  /**
   * Extract main readable text from an HTML string.
   * Uses DOMParser when available (browser / happy-dom); returns "" otherwise.
   */
  function extractTextFromHtml(html, parseFromString) {
    try {
      if (!html || typeof html !== "string") return "";

      const parse =
        parseFromString ||
        (typeof DOMParser !== "undefined"
          ? (h, type) => new DOMParser().parseFromString(h, type)
          : null);
      if (!parse) return "";

      const doc = parse(html, "text/html");
      // Intentionally skip injecting <base> — many sites enforce base-uri CSP.
      stripNonContentElements(doc);

      let bestText = pickBestCandidateText(collectContentCandidates(doc));
      if (!bestText && doc.body) {
        bestText = cleanExtractedText(doc.body.textContent || "");
      }
      return bestText;
    } catch {
      return "";
    }
  }

  return {
    canInjectPageUi,
    toAbsoluteUrl,
    resolveElementNavigation,
    cleanExtractedText,
    collectContentCandidates,
    pickBestCandidateText,
    stripNonContentElements,
    extractTextFromHtml,
  };
});
