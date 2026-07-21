/**
 * Pure helpers for legal-link detection.
 * Loaded before content.js in the content-script world, and importable from Vitest.
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for classic content scripts.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestLegalLinkUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  // Standalone keywords — flag a link as legal as soon as any of these appear
  // in its visible text / aria / title / id.
  const KEYWORDS = [
    "terms",
    "terms of service",
    "terms & conditions",
    "terms and conditions",
    "t&c",
    "t & c",
    "privacy",
    "privacy policy",
    "privacy statement",
    "refund",
    "refund policy",
    "return",
    "returns",
    "return policy",
    "exchange",
    "exchanges",
    "cancellation",
    "cancellation policy",
    "eula",
    "end user license",
    "licence agreement",
    "license agreement",
    "legal",
    "legal notice",
    "cookie policy",
    "data protection"
  ];

  // Ambiguous keywords that frequently appear in non-legal contexts.
  // Only flag when a supporting qualifier is also present.
  const QUALIFIED_KEYWORDS = [
    {
      word: "subscription",
      qualifiers: ["terms", "agreement", "policy", "cancel", "manage", "billing"]
    },
    {
      word: "subscriptions",
      qualifiers: ["terms", "agreement", "policy", "cancel", "manage", "billing"]
    },
    {
      word: "billing",
      qualifiers: ["terms", "policy", "dispute", "support", "agreement"]
    },
    {
      word: "cookie",
      qualifiers: ["policy", "notice", "settings", "consent", "preferences"]
    },
    {
      word: "cookies",
      qualifiers: ["policy", "notice", "settings", "consent", "preferences"]
    }
  ];

  function normalizeText(str) {
    return (str || "")
      .toLowerCase()
      .replace(/&amp;/g, "&")
      .replace(/termsandconditions/g, "terms and conditions")
      .replace(/privacystatement/g, "privacy statement")
      .replace(/privacypolicy/g, "privacy policy")
      .replace(/cookiepolicy/g, "cookie policy")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Strict URL matcher: keyword must be its own path segment (or segment-with-suffix)
   * at or near the end of the path. Query strings and fragments are ignored.
   * @param {string} href
   * @param {string} [baseOrigin] injectable for tests; defaults to window.location.origin
   */
  function isLegalUrlPath(href, baseOrigin) {
    if (!href) return false;
    let path = "";
    try {
      const origin =
        baseOrigin ||
        (typeof window !== "undefined" && window.location && window.location.origin) ||
        "https://example.com";
      const url = new URL(href, origin);
      path = url.pathname.toLowerCase();
    } catch (_) {
      return false;
    }
    if (!path || path === "/") return false;

    const segments = path.replace(/\/+$/, "").split("/").filter(Boolean);
    if (segments.length === 0) return false;

    // Only inspect the last 2 segments — legitimate legal pages live near the
    // end of the path, not buried inside product/category structures.
    const tail = segments.slice(-2);

    const segmentRegex =
      /^(terms|terms-of-(service|use|sale)|t-and-c|tandc|privacy|privacy-(policy|statement|notice)|cookie(s)?|cookie-policy|refund|refund-policy|return(s)?|return-policy|cancellation|cancellation-policy|legal|legal-notice|eula|end-user-license|licen[sc]e-agreement|data-protection|data-policy)$/;

    return tail.some((seg) => segmentRegex.test(seg));
  }

  /**
   * Match visible/aria/title/id text against legal keywords (after branding strip).
   * @param {string} visibleCombined already-normalized combined signals
   */
  function visibleTextLooksLegal(visibleCombined) {
    let combined = (visibleCombined || "").replace(/termsdigest/gi, "");
    if (!combined.trim()) return false;

    if (KEYWORDS.some((k) => combined.includes(k))) return true;

    return QUALIFIED_KEYWORDS.some(
      ({ word, qualifiers }) =>
        combined.includes(word) && qualifiers.some((q) => combined.includes(q))
    );
  }

  /**
   * DOM-free candidate check used by isLikelyLegalLink.
   * @param {{
   *   tagName?: string,
   *   role?: string|null,
   *   hasOnclick?: boolean,
   *   href?: string,
   *   text?: string,
   *   ariaLabel?: string|null,
   *   title?: string|null,
   *   id?: string|null,
   *   className?: string,
   *   isInsideCode?: boolean,
   *   baseOrigin?: string
   * }} signals
   */
  function isLikelyLegalLinkSignals(signals) {
    if (!signals) return false;

    const tagName = (signals.tagName || "").toUpperCase();
    const isLink = tagName === "A";
    const isButton = tagName === "BUTTON";
    const isClickable =
      signals.role === "link" ||
      signals.role === "button" ||
      !!signals.hasOnclick;

    if (!isLink && !isButton && !isClickable) return false;
    if (signals.isInsideCode) return false;

    const elClass = (signals.className || "").toLowerCase();
    if (
      elClass.includes("code") ||
      elClass.includes("syntax") ||
      elClass.includes("hljs") ||
      elClass.includes("prism")
    ) {
      return false;
    }

    const href = signals.href || "";
    if (isLink && href === "#") return false;

    const txt = normalizeText(signals.text);
    const aria = normalizeText(signals.ariaLabel);
    const title = normalizeText(signals.title);
    const id = normalizeText(signals.id || "");

    let visibleCombined = `${txt} ${aria} ${title} ${id}`;
    if (!visibleCombined.trim() && !href) return false;
    if (txt.length > 100) return false;

    if (visibleTextLooksLegal(visibleCombined)) return true;
    return isLegalUrlPath(href, signals.baseOrigin);
  }

  /** Coerce checkbox prefs if storage ever has strings */
  function normalizePrefsPatch(patch) {
    if (!patch || typeof patch !== "object") return {};
    const out = { ...patch };
    for (const key of ["autoHover", "showRedFlags", "showQuotes", "enableCaching"]) {
      if (Object.prototype.hasOwnProperty.call(out, key)) {
        const v = out[key];
        if (v === true || v === "true") out[key] = true;
        else if (v === false || v === "false") out[key] = false;
      }
    }
    return out;
  }

  /**
   * Prefer tap-to-summarize on phones/tablets and coarse pointers (iOS Safari).
   * @param {{ matchMedia?: Function, userAgent?: string, maxTouchPoints?: number }} [env]
   */
  function prefersTouchSummarize(env) {
    try {
      const matchMedia = env?.matchMedia;
      const ua = env?.userAgent ?? "";
      const maxTouchPoints = env?.maxTouchPoints ?? 0;

      if (typeof matchMedia === "function" && matchMedia("(pointer: coarse)")?.matches) {
        return true;
      }
      if (/iPhone|iPad|iPod/i.test(ua)) return true;
      if (/Macintosh/i.test(ua) && maxTouchPoints > 1) return true;
      return false;
    } catch {
      return false;
    }
  }

  return {
    KEYWORDS,
    QUALIFIED_KEYWORDS,
    normalizeText,
    isLegalUrlPath,
    visibleTextLooksLegal,
    isLikelyLegalLinkSignals,
    normalizePrefsPatch,
    prefersTouchSummarize
  };
});
