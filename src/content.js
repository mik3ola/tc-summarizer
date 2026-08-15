let HOVER_DELAY_MS = 750;
const POPOVER_MAX_WIDTH_PX = 420;

/** Prefer tap-to-summarize on phones/tablets and coarse pointers (iOS Safari). */
function prefersTouchSummarize() {
  try {
    if (window.matchMedia?.("(pointer: coarse)")?.matches) return true;
    const ua = navigator.userAgent || "";
    if (/iPhone|iPad|iPod/i.test(ua)) return true;
    // iPadOS 13+ may report as Macintosh but still be touch-first
    if (/Macintosh/i.test(ua) && (navigator.maxTouchPoints || 0) > 1) return true;
    return false;
  } catch {
    return false;
  }
}

const TOUCH_SUMMARIZE = prefersTouchSummarize();

// Check if extension context is still valid (false after extension reload)
function isExtensionContextValid() {
  try {
    return typeof chrome !== "undefined" && !!chrome?.runtime?.id;
  } catch {
    return false;
  }
}

// True if error is due to extension reload (context invalidated)
function isContextInvalidatedError(e) {
  const msg = (e?.message || String(e)).toLowerCase();
  return msg.includes("context invalidated") || msg.includes("message port closed") ||
    msg.includes("reading 'get'") || msg.includes("reading 'sendmessage'") || msg.includes("reading 'runtime'");
}

// Preferences (loaded from storage)
let preferences = {
  autoHover: true,
  showRedFlags: true,
  showQuotes: true,
  hoverDelay: 750
};

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

// Load preferences from storage
async function loadPreferences() {
  if (!isExtensionContextValid()) return;
  try {
    const response = await chrome.runtime.sendMessage({ type: "get_preferences" });
    if (response?.ok && response.preferences) {
      preferences = { ...preferences, ...normalizePrefsPatch(response.preferences) };
      HOVER_DELAY_MS = parseInt(String(preferences.hoverDelay), 10) || 750;
    }
  } catch (e) {
    if (!isContextInvalidatedError(e)) {
      console.warn("[TermsDigest] Could not load preferences:", e);
    }
  }
}

// Load preferences on startup
loadPreferences();

// Standalone keywords — flagging a link as legal as soon as any of these appear
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

// Ambiguous keywords that frequently appear in non-legal contexts (e.g. the
// "Subscriptions" tab on YouTube, "Billing" on a banking app, "Cookies" on a
// recipe site). These only flag the link if a qualifier is *also* present —
// turning bare "Subscriptions" into a no-op while still catching things like
// "Subscription terms" or "Manage subscription".
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
  // Normalize whitespace, ampersands, and common variations
  // Also split compound words like "termsandconditions" → "terms and conditions"
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

function isLikelyLegalLink(el) {
  if (!el) return false;
  
  // Support <a>, <button>, and clickable elements
  const tagName = el.tagName?.toUpperCase();
  const isLink = tagName === "A";
  const isButton = tagName === "BUTTON";
  const isClickable = el.getAttribute("role") === "link" || el.getAttribute("role") === "button" || el.onclick || el.getAttribute("onclick");
  
  if (!isLink && !isButton && !isClickable) return false;
  
  // Skip code elements - avoid false positives from code snippets containing "return", "terms", etc.
  const isInsideCode = el.closest("pre, code, .hljs, .highlight, .prism-code, [class*='code'], [class*='syntax']");
  if (isInsideCode) return false;
  
  // Skip if element itself looks like code
  // Note: on SVG elements, el.className is an SVGAnimatedString object (not a string),
  // so we normalize to a plain string before calling toLowerCase().
  const rawClass = typeof el.className === "string"
    ? el.className
    : (el.className?.baseVal || "");
  const elClass = rawClass.toLowerCase();
  if (elClass.includes("code") || elClass.includes("syntax") || elClass.includes("hljs") || elClass.includes("prism")) {
    return false;
  }
  
  // Get the URL (if any)
  const href = el.getAttribute("href") || el.getAttribute("data-href") || "";
  
  // For actual links, skip pure anchors (but allow defined anchors like #terms-section)
  // BUT: allow javascript:void(0) if it matches legal keywords (might be modal trigger)
  if (isLink && href) {
    if (href === "#") return false;
    // Don't filter out javascript:void(0) - might be a modal trigger we can handle
  }
  
  // Gather text to match against
  const txt = normalizeText(el.textContent);
  const aria = normalizeText(el.getAttribute("aria-label"));
  const title = normalizeText(el.getAttribute("title"));
  const id = normalizeText(el.getAttribute("id") || "");

  // Visible-text signals (most reliable): link text, aria-label, title, id.
  // URLs are NOT included here to avoid false positives from retail sites where
  // navigation URLs contain words like "return" or "terms" as unrelated segments.
  let visibleCombined = `${txt} ${aria} ${title} ${id}`;
  if (!visibleCombined.trim() && !href) return false;

  // Skip if the text is too long (likely a code block or paragraph, not a link label)
  if (txt.length > 100) return false;

  // Filter out "termsdigest" to avoid false positives on our own branding
  visibleCombined = visibleCombined.replace(/termsdigest/gi, "");

  if (KEYWORDS.some((k) => visibleCombined.includes(k))) return true;

  // Qualified keywords: only count if a supporting qualifier is also present.
  if (
    QUALIFIED_KEYWORDS.some(
      ({ word, qualifiers }) =>
        visibleCombined.includes(word) &&
        qualifiers.some((q) => visibleCombined.includes(q))
    )
  ) {
    return true;
  }

  // Fallback: match on URL ONLY if the keyword appears as a dedicated path segment
  // near the end of the URL — e.g. "/terms", "/terms-of-service", "/privacy-policy".
  // Rejects noisy URLs like "/womens/?return_policy=true" or "/search?q=terms".
  return isLegalUrlPath(href);
}

// Strict URL matcher: keyword must be its own path segment (or segment-with-suffix)
// at or near the end of the path. Query strings and fragments are ignored.
function isLegalUrlPath(href) {
  if (!href) return false;
  let path = "";
  try {
    // Handle relative URLs by resolving against the current origin.
    const url = new URL(href, window.location.origin);
    path = url.pathname.toLowerCase();
  } catch (_) {
    // Not a resolvable URL (e.g. "javascript:void(0)"); skip URL matching.
    return false;
  }
  if (!path || path === "/") return false;

  // Strip trailing slash and split into segments.
  const segments = path.replace(/\/+$/, "").split("/").filter(Boolean);
  if (segments.length === 0) return false;

  // Only inspect the last 2 segments — legitimate legal pages live near the
  // end of the path (e.g. /help/legal/privacy-policy), not buried inside
  // product/category structures (e.g. /terms/dresses/sale).
  const tail = segments.slice(-2);

  const segmentRegex = /^(terms|terms-of-(service|use|sale)|t-and-c|tandc|privacy|privacy-(policy|statement|notice)|cookie(s)?|cookie-policy|refund|refund-policy|return(s)?|return-policy|cancellation|cancellation-policy|legal|legal-notice|eula|end-user-license|licen[sc]e-agreement|data-protection|data-policy)$/;

  return tail.some((seg) => segmentRegex.test(seg));
}

// Determine what TYPE of legal content a button/link is for
function getLegalContentType(element) {
  const text = (element.textContent || "").toLowerCase();
  const id = (element.getAttribute("id") || "").toLowerCase();
  const combined = `${text} ${id}`;
  
  if (combined.includes("privacy") || combined.includes("privacystatement") || combined.includes("privacy-statement")) {
    return "privacy";
  }
  if (combined.includes("terms") || combined.includes("termsandconditions") || combined.includes("conditions") || combined.includes("eula")) {
    return "terms";
  }
  if (combined.includes("cookie")) {
    return "cookie";
  }
  if (combined.includes("security")) {
    return "security";
  }
  if (combined.includes("refund") || combined.includes("cancellation") || combined.includes("return")) {
    return "refund";
  }
  return "legal"; // generic
}

function findModalContent(element) {
  const contentType = getLegalContentType(element);
  
  // Strategy 1: Look for data-target or data-bs-target (Bootstrap)
  const modalTarget = element.getAttribute("data-target") || element.getAttribute("data-bs-target") || "";
  if (modalTarget && modalTarget.startsWith("#")) {
    const modal = document.querySelector(modalTarget);
    if (modal) return modal;
  }
  
  // Strategy 2: Look for content that SPECIFICALLY matches the button's intent
  const elementId = element.getAttribute("id") || "";
  
  // Build selectors specific to this content type
  const typeSpecificSelectors = [];
  if (contentType === "privacy") {
    typeSpecificSelectors.push(
      '.privacy-statement', '.privacy-policy', '.privacy-notice', '.privacy-content',
      'section[class*="privacy"]', 'div[class*="privacy"]',
      '[id*="privacy"]', '[class*="privacystatement"]', '[class*="privacy-statement"]'
    );
  } else if (contentType === "terms") {
    typeSpecificSelectors.push(
      '.terms-conditions', '.terms-and-conditions', '.terms-content', '.terms-statement',
      '.termsandconditions', '.terms-of-use', '.terms-of-service',
      'section[class*="terms"]', 'div[class*="terms"]',
      '[id*="terms"]', '[class*="termsandconditions"]', '[class*="conditions"]'
    );
  } else if (contentType === "cookie") {
    typeSpecificSelectors.push(
      '.cookie-policy', '.cookie-notice', '.cookie-content', '.cookies',
      'section[class*="cookie"]', 'div[class*="cookie"]', '[id*="cookie"]'
    );
  } else if (contentType === "security") {
    typeSpecificSelectors.push(
      '.security-policy', '.security-notice', '.security-content', '.security-statement',
      'section[class*="security"]', 'div[class*="security"]', '[id*="security"]'
    );
  }
  
  // Try type-specific selectors FIRST
  for (const selector of typeSpecificSelectors) {
    try {
      const candidates = document.querySelectorAll(selector);
      for (const candidate of candidates) {
        if (candidate === element) continue;
        const text = (candidate.textContent || "").trim();
        if (text.length > 100) {
          return candidate;
        }
      }
    } catch (e) {
      // Invalid selector, skip
    }
  }
  
  // Strategy 3: Try ID-based patterns
  if (elementId) {
    const baseId = elementId
      .replace(/-link$/, "")
      .replace(/-button$/, "")
      .replace(/^footer-/, "")
      .replace(/^welcome-overlay-/, "");
    
    const candidates = [
      `#${baseId}-modal`, `#${baseId}-overlay`, `#${baseId}-dialog`, `#${baseId}-content`,
      `#${baseId}`, `.${baseId}`, `[class*="${baseId}"]`, `section.${baseId}`
    ];
    for (const selector of candidates) {
      try {
        const modal = document.querySelector(selector);
        if (modal && modal !== element) {
          const text = (modal.textContent || "").trim();
          if (text.length > 100) {
            return modal;
          }
        }
      } catch (e) {
        // Invalid selector, skip
      }
    }
  }
  
  // Strategy 4: Look for aria-controls or aria-describedby
  const ariaControls = element.getAttribute("aria-controls") || element.getAttribute("aria-describedby") || "";
  if (ariaControls) {
    const modal = document.querySelector(`#${ariaControls}`);
    if (modal) return modal;
  }
  
  // Strategy 5: Look for visible modals that match our content type
  const visibleModals = document.querySelectorAll('.modal.show, .overlay.show, [role="dialog"], .modal:not([style*="display: none"])');
  for (const modal of visibleModals) {
    const modalText = (modal.textContent || "").toLowerCase();
    const modalClass = (modal.className || "").toLowerCase();
    const modalId = (modal.id || "").toLowerCase();
    
    // Check if this modal matches our content type
    if (contentType === "privacy" && (modalText.includes("privacy") || modalClass.includes("privacy") || modalId.includes("privacy"))) {
      if (modalText.length > 100) return modal;
    }
    if (contentType === "terms" && (modalText.includes("terms") || modalClass.includes("terms") || modalId.includes("terms"))) {
      if (modalText.length > 100) return modal;
    }
  }
  
  // Strategy 6: Search ALL elements for content matching our type (last resort)
  const allElements = document.querySelectorAll('section, div, article, main');
  let bestMatch = null;
  let bestMatchScore = 0;
  
  for (const el of allElements) {
    if (el === element) continue;
    const text = (el.textContent || "").toLowerCase();
    const className = (el.className || "").toLowerCase();
    const id = (el.id || "").toLowerCase();
    
    // Score based on content type match
    let score = 0;
    if (contentType === "privacy") {
      if (className.includes("privacy") || id.includes("privacy")) score += 10;
      if (text.includes("privacy policy") || text.includes("privacy notice")) score += 5;
    } else if (contentType === "terms") {
      if (className.includes("terms") || id.includes("terms")) score += 10;
      if (text.includes("terms of use") || text.includes("terms and conditions")) score += 5;
    }
    
    // Must have substantial content
    if (text.length > 200 && score > bestMatchScore) {
      bestMatch = el;
      bestMatchScore = score;
    }
  }
  
  if (bestMatch && bestMatchScore > 0) {
    return bestMatch;
  }
  
  // Strategy 7: Generic fallback - any legal content
  const legalSelectors = [
    '.legal-content', '.legal-statement', '.legal-notice',
    'section[class*="legal"]', 'div[class*="legal"]'
  ];
  for (const selector of legalSelectors) {
    try {
      const candidates = document.querySelectorAll(selector);
      for (const candidate of candidates) {
        if (candidate === element) continue;
        const text = (candidate.textContent || "").trim();
        if (text.length > 100) {
          return candidate;
        }
      }
    } catch (e) {
      // Invalid selector, skip
    }
  }
  
  // Strategy 7: Look for hidden modals that might contain the content
  // Some frameworks keep modals in DOM but hidden
  const allModals = document.querySelectorAll('.modal, .overlay, [role="dialog"], [class*="modal"], [class*="overlay"]');
  for (const modal of allModals) {
    const text = (modal.textContent || "").toLowerCase();
    // Check if it contains substantial legal content (even if hidden)
    if (KEYWORDS.some(k => text.includes(k)) && text.length > 200) {
      return modal;
    }
  }
  
  // Strategy 8: If link is inside a modal, look for sibling content or parent modal content
  // (e.g., Terms link inside Welcome modal might load content in same modal)
  let checkParent = element.parentElement;
  let checkDepth = 0;
  while (checkParent && checkDepth < 10) {
    // Check if parent is a modal/overlay
    const isModal = checkParent.matches && (
      checkParent.matches('.modal, .overlay, [role="dialog"]') ||
      checkParent.className?.toLowerCase().includes('modal') ||
      checkParent.className?.toLowerCase().includes('overlay')
    );
    if (isModal) {
      // This link is inside a modal - the content might be in this same modal
      // or a nested modal/iframe
      const text = (checkParent.textContent || "").toLowerCase();
      if (KEYWORDS.some(k => text.includes(k)) && text.length > 200) {
        return checkParent;
      }
    }
    checkParent = checkParent.parentElement;
    checkDepth++;
  }
  
  // Strategy 9: Look for iframes that might contain the content
  // Some sites load Terms in iframes
  const iframes = document.querySelectorAll('iframe');
  for (const iframe of iframes) {
    try {
      // Try to access iframe content (only works if same-origin)
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        const text = (iframeDoc.body?.textContent || "").toLowerCase();
        if (KEYWORDS.some(k => text.includes(k)) && text.length > 200) {
          return iframeDoc.body;
        }
      }
    } catch (e) {
      // Cross-origin iframe, can't access
    }
  }
  
  return null;
}

function getUrlFromElement(el) {
  // Try various attributes for the URL
  const href = el.getAttribute("href") || el.getAttribute("data-href") || "";
  if (href && !href.startsWith("#") && !href.startsWith("javascript:")) {
    return { type: "url", value: href };
  }
  // For buttons/clickable elements, check if there's a data attribute with URL
  const dataUrl = el.getAttribute("data-url") || el.getAttribute("data-link") || "";
  if (dataUrl) return { type: "url", value: dataUrl };
  
  // Check for Bootstrap modal trigger (common pattern for inline T&C)
  const modalTarget = el.getAttribute("data-target") || el.getAttribute("data-bs-target") || "";
  if (modalTarget && modalTarget.startsWith("#")) {
    return { type: "modal", value: modalTarget };
  }
  
  // Check if this is a JavaScript-triggered modal or button
  if (href.startsWith("javascript:") || !href || href === "#") {
    const modalContent = findModalContent(el);
    if (modalContent) {
      return { type: "modal-element", value: modalContent };
    }
    
    // Content not found in DOM - might need to be loaded first
    // Return a special type that tells the UI to show a helpful message
    return { type: "click-to-load", value: el };
  }
  
  return null;
}

function toAbsoluteUrl(href) {
  try {
    // Handle relative URLs properly
    const url = new URL(href, window.location.href);
    return url.toString();
  } catch {
    return null;
  }
}

function extractTextFromHtml(html, baseUrl) {
  try {
    if (!html || typeof html !== "string") {
      console.warn("[TermsDigest] No HTML provided");
      return "";
    }
    
    const doc = new DOMParser().parseFromString(html, "text/html");
    // Note: we intentionally skip injecting a <base> element here.
    // It would be nice for relative URL resolution, but many sites (GitHub, Stripe,
    // gov.uk, etc.) enforce a strict base-uri CSP that spams the extension error
    // console without us gaining anything — we only read text content, not URLs.

    // Remove only script/style (keep other elements - some sites put content in unusual places)
    doc.querySelectorAll("script, style, noscript, svg, canvas").forEach((el) => el.remove());

    // Try multiple strategies to find the main content
    const candidates = [
      doc.querySelector("main"),
      doc.querySelector('[role="main"]'),
      doc.querySelector("article"),
      doc.querySelector(".content"),
      doc.querySelector("#content"),
      doc.querySelector(".main-content"),
      doc.querySelector(".page-content"),
      doc.querySelector(".entry-content"),
      doc.querySelector(".post-content"),
      doc.body
    ].filter(Boolean);

    // Find the candidate with the most text content
    let bestText = "";
    for (const candidate of candidates) {
      const rawText = candidate?.textContent || "";
      const cleaned = rawText
        .replace(/\u00a0/g, " ")
        .replace(/[\t ]+/g, " ")
        .replace(/ *\n */g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      
      if (cleaned.length > bestText.length) {
        bestText = cleaned;
      }
    }

    // Fallback: if still empty, try the entire HTML body
    if (!bestText && doc.body) {
      bestText = (doc.body.textContent || "")
        .replace(/\u00a0/g, " ")
        .replace(/[\t ]+/g, " ")
        .replace(/ *\n */g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }

    return bestText;
  } catch (e) {
    console.error("[TermsDigest] extractTextFromHtml error:", e);
    return "";
  }
}

function createUi() {
  // Skip non-HTML documents (e.g. standalone SVG, XML, or image viewers)
  // where injecting a UI element would fail or be meaningless.
  // Return a harmless stub so downstream event listeners can still attach
  // without crashing — we just gate any real work with `UI.host` checks.
  if (!document.body || !(document.documentElement instanceof HTMLElement)) {
    const noop = () => {};
    const stubTarget = { addEventListener: noop, removeEventListener: noop };
    return { host: null, shadow: null, popover: stubTarget };
  }

  const host = document.createElement("div");
  host.id = "termsdigest-root";
  try { host.style.all = "initial"; } catch (_) { /* some doc types disallow */ }
  host.style.position = "fixed";
  host.style.zIndex = "2147483647";
  host.style.left = "0px";
  host.style.top = "0px";
  host.style.width = "0px";
  host.style.height = "0px";

  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = `
    /* Neumorphic surface — slightly tinted dark base so dual shadows are visible. */
    .popover {
      position: fixed;
      max-width: ${POPOVER_MAX_WIDTH_PX}px;
      min-width: 300px;
      max-height: 70vh;
      overflow-y: auto;
      background: linear-gradient(135deg, #2f3139 0%, #23262d 100%);
      color: #e5e7eb;
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 18px;
      box-shadow:
        14px 18px 38px rgba(0,0,0,0.55),
        6px 8px 14px rgba(0,0,0,0.42),
        inset 1px 1px 0 rgba(255,255,255,0.05),
        inset -1px -1px 0 rgba(0,0,0,0.35);
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
      font-size: 13px;
      line-height: 1.6;
      padding: 0;
    }
    .popover::-webkit-scrollbar { width: 6px; }
    .popover::-webkit-scrollbar-track { background: transparent; }
    .popover::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.35); border-radius: 3px; }
    .popover::-webkit-scrollbar-thumb:hover { background: rgba(148,163,184,0.5); }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      position: sticky;
      top: 0;
      background: linear-gradient(180deg, rgba(47,49,57,0.97) 0%, rgba(40,43,51,0.85) 100%);
      backdrop-filter: blur(12px);
      padding: 14px 16px 10px;
      margin: 0;
      z-index: 1;
      border-radius: 18px 18px 0 0;
    }
    /* Close control — styled after generic button rules (see button.popover-close below) */
    .header::after {
      content: "";
      position: absolute;
      left: 14px;
      right: 14px;
      bottom: 0;
      height: 1px;
      background: rgba(0,0,0,0.4);
      box-shadow: 0 1px 0 rgba(255,255,255,0.04);
      pointer-events: none;
    }
    .row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .title {
      flex: 1;
      min-width: 0;
      font-size: 12px;
      color: rgba(226,232,240,0.9);
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 290px;
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 7px;
      flex-shrink: 0;
      white-space: nowrap;
    }
    .header-right:empty { display: none; }
    .confidence-label { font-size: 10px; color: rgba(226,232,240,0.6); }
    .badge {
      font-size: 11px;
      padding: 5px 10px;
      border-radius: 999px;
      border: none;
      background: linear-gradient(135deg, #1d2027 0%, #131519 100%);
      color: rgba(226,232,240,0.85);
      white-space: nowrap;
      flex-shrink: 0;
      box-shadow:
        4px 5px 10px rgba(0,0,0,0.56),
        inset 1px 1px 0 rgba(255,255,255,0.035),
        inset -1px -1px 0 rgba(0,0,0,0.42);
    }
    .badge-high {
      color: rgba(134,239,172,0.95);
      text-shadow: 0 0 8px rgba(34,197,94,0.38);
    }
    .badge-medium {
      color: rgba(253,224,71,0.95);
      text-shadow: 0 0 8px rgba(234,179,8,0.42);
    }
    .badge-low {
      color: rgba(252,165,165,0.95);
      text-shadow: 0 0 8px rgba(239,68,68,0.42);
    }
    .muted { color: rgba(226,232,240,0.72); }
    .red-flags-section li { color: #f87171; }
    .section { margin-top: 0; padding: 0 14px; }
    .popover > .section:first-of-type { margin-top: 0; }
    .h { font-weight: 700; color: rgba(226,232,240,0.95); margin-bottom: 4px; }
    ul { margin: 0; padding-left: 18px; }
    li { margin: 3px 0; line-height: 1.55; }
    .divider { height: 1px; background: rgba(0,0,0,0.4); box-shadow: 0 1px 0 rgba(255,255,255,0.04); margin: 20px 14px 14px; }
    /* Footer quick-pref row — flat; only checkbox toggle is clickable */
    .footer-quick-prefs {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
      padding: 8px 14px 0;
    }
    .footer-pref-row {
      display: flex;
      align-items: center;
      gap: 7px;
    }
    .footer-pref-label {
      font-size: 10px;
      font-weight: 600;
      color: rgba(226,232,240,0.72);
      user-select: none;
      pointer-events: none;
    }
    .footer-pref-toggle {
      all: unset;
      box-sizing: border-box;
      cursor: pointer;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .footer-pref-toggle:focus-visible .chip-icon {
      outline: 1px solid rgba(96,165,250,0.45);
      outline-offset: 2px;
    }
    .footer-pref-toggle .chip-icon {
      width: 12px;
      height: 12px;
      border-radius: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #2a2d35, #1d2027);
      box-shadow: inset 2px 2px 4px rgba(0,0,0,0.5), inset -1px -1px 3px rgba(255,255,255,0.04);
      flex-shrink: 0;
      transition: box-shadow 0.18s ease;
    }
    .footer-pref-toggle:hover .chip-icon {
      box-shadow:
        inset 2px 2px 4px rgba(0,0,0,0.45),
        inset -1px -1px 3px rgba(255,255,255,0.07),
        0 0 0 1px rgba(255,255,255,0.06);
    }
    .footer-pref-toggle.active .chip-icon {
      background: linear-gradient(135deg, #2a2d35, #1d2027);
      box-shadow: inset 2px 2px 4px rgba(0,0,0,0.5), inset -1px -1px 3px rgba(255,255,255,0.04);
    }
    .chip-tick { display: none; }
    .footer-pref-toggle.active .chip-tick { display: block; }
    .chip-empty { display: block; }
    .footer-pref-toggle.active .chip-empty { display: none; }
    .buttons { display:flex; gap: 8px; margin-top: 14px; padding: 0 14px 14px; }
    .buttons button { flex: 1; }
    .footer-stats {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 14px 14px;
      margin-top: 0;
      gap: 10px;
    }
    .footer-stat {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
      min-width: 58px;
    }
    .footer-stat-value {
      font-size: 12px;
      font-weight: 600;
      color: rgba(96,165,250,0.95);
      line-height: 1;
    }
    .footer-stat-label {
      font-size: 10px;
      color: rgba(226,232,240,0.6);
      line-height: 1;
    }
    .footer-brand-settings {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }
    .footer-brand {
      display: flex;
      align-items: center;
      gap: 4px;
      opacity: 0.45;
      margin-right: 2px;
    }
    .footer-brand img {
      width: 12px;
      height: 12px;
      border-radius: 2px;
    }
    .footer-brand span {
      font-size: 10px;
      font-weight: 600;
      color: rgba(226,232,240,0.9);
      letter-spacing: 0.02em;
    }
    button {
      all: unset;
      cursor: pointer;
      border: 1px solid rgba(148,163,184,0.25);
      border-radius: 4px;
      padding: 10px 16px;
      font-size: 13px;
      font-weight: 500;
      color: rgba(226,232,240,0.95);
      background: rgba(30,41,59,0.9);
      transition: all 0.15s;
      text-align: center;
    }
    button:hover { 
      background: rgba(51,65,85,0.95); 
      border-color: rgba(148,163,184,0.4);
    }
    button.primary {
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      border-color: rgba(59,130,246,0.5);
      color: #fff;
      font-weight: 600;
    }
    button.primary:hover {
      background: linear-gradient(135deg, #2563eb, #7c3aed);
    }
    /* Header close — plain letter x, no chrome (must follow generic button rules) */
    button.popover-close {
      all: unset;
      box-sizing: border-box;
      position: absolute;
      top: 1px;
      right: 1px;
      z-index: 10;
      cursor: pointer;
      font-family: inherit;
      font-size: 14px;
      font-weight: 700;
      line-height: 1;
      letter-spacing: -0.04em;
      color: #000;
      padding: 2px 3px;
      margin: 0;
      background: transparent !important;
      border: none !important;
      border-radius: 0;
      box-shadow: none !important;
      display: flex;
      align-items: center;
      justify-content: center;
      text-shadow:
        0 1px 2px rgba(0,0,0,0.55),
        0 2px 5px rgba(0,0,0,0.45),
        0 4px 10px rgba(0,0,0,0.35),
        0 0 1px rgba(255,255,255,0.12);
      transition: opacity 0.15s ease, color 0.15s ease, text-shadow 0.15s ease;
    }
    button.popover-close:hover {
      color: #0a0a0a;
      opacity: 0.92;
      background: transparent !important;
      border: none !important;
      text-shadow:
        0 2px 4px rgba(0,0,0,0.65),
        0 4px 12px rgba(0,0,0,0.4),
        0 0 1px rgba(255,255,255,0.15);
    }
    button.popover-close:focus-visible {
      outline: 1px solid rgba(96,165,250,0.55);
      outline-offset: 2px;
    }
    /* Extension tile + copy — same square neumorphic control (after generic button rules) */
    a.footer-settings,
    button.footer-copy-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      color: rgba(148,163,184,0.75);
      cursor: pointer;
      border-radius: 5px;
      transition: box-shadow 0.22s ease, background 0.22s ease, color 0.22s ease;
      flex-shrink: 0;
      background: linear-gradient(135deg, #1d2027 0%, #131519 100%);
      border: 1px solid rgba(255,255,255,0.05);
      box-shadow:
        2px 3px 6px rgba(0,0,0,0.55),
        inset 1px 1px 0 rgba(255,255,255,0.04),
        inset -1px -1px 0 rgba(0,0,0,0.4);
      text-decoration: none;
      padding: 0;
      margin: 0;
      box-sizing: border-box;
    }
    a.footer-settings:hover,
    button.footer-copy-btn:hover {
      background:
        radial-gradient(ellipse 125% 95% at 28% 16%, rgba(255,255,255,0.14) 0%, transparent 52%),
        linear-gradient(135deg, #1d2027 0%, #131519 100%);
      box-shadow:
        2px 4px 8px rgba(0,0,0,0.48),
        inset 3px 3px 7px rgba(255,255,255,0.07),
        inset -2px -2px 5px rgba(0,0,0,0.42);
    }
    .footer-settings svg,
    .footer-copy-btn svg {
      width: 11px;
      height: 11px;
    }
    button.footer-copy-btn.copied {
      color: rgba(134,239,172,0.95);
    }
    a.link { color: rgba(96,165,250,0.95); text-decoration: none; }
    a.link:hover { text-decoration: underline; }
    .error-banner {
      border: 1px solid rgba(248,113,113,0.4);
      background: rgba(127,29,29,0.3);
      padding: 12px 16px;
      border-radius: 8px;
      color: rgba(254,226,226,0.95);
      margin: 12px 12px 0;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      font-weight: 500;
    }
    .error-icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }
    .loading-dots span {
      display: inline-block;
      animation: dot-bounce 1.4s ease-in-out infinite both;
    }
    .loading-dots span:nth-child(1) { animation-delay: 0s; }
    .loading-dots span:nth-child(2) { animation-delay: 0.15s; }
    .loading-dots span:nth-child(3) { animation-delay: 0.3s; }
    .loading-dots span:nth-child(4) { animation-delay: 0.45s; }
    @keyframes dot-bounce {
      0%, 80%, 100% { opacity: 0.35; transform: scale(0.85); }
      40% { opacity: 1; transform: scale(1); }
    }
    .ring-loader {
      width: 20px;
      height: 20px;
      color: rgba(255,255,255,0.95);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .ring-loader svg {
      width: 100%;
      height: 100%;
    }
    /* Neumorphic indeterminate bar — bright orange chunk sweeps left → right. */
    .td-loading-bar {
      position: relative;
      height: 4px;
      margin: 4px 16px 12px;
      border-radius: 999px;
      background: rgba(255,255,255,0.04);
      box-shadow:
        inset 0 1px 2px rgba(0,0,0,0.55),
        inset 0 -1px 0 rgba(255,255,255,0.04);
      overflow: hidden;
    }
    .td-loading-bar-fill {
      position: absolute;
      top: 0;
      left: -45%;
      height: 100%;
      width: 35%;
      border-radius: inherit;
      background: linear-gradient(90deg, rgba(255,120,73,0.0), #ff7849 25%, #ff6a3d 70%, rgba(255,120,73,0.0));
      box-shadow: 0 0 12px rgba(255,120,73,0.55);
      animation: td-loading-sweep 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
      will-change: left, width;
    }
    @keyframes td-loading-sweep {
      0%   { left: -45%; width: 35%; }
      55%  { left: 35%;  width: 45%; }
      100% { left: 105%; width: 35%; }
    }
    @media (prefers-reduced-motion: reduce) {
      .td-loading-bar-fill {
        animation: none;
        left: 0;
        width: 100%;
        opacity: 0.7;
      }
    }
    .reveal-line {
      opacity: 0;
      animation: slide-up-fade 0.4s ease-out forwards;
    }
    .reveal-line:nth-child(1) { animation-delay: 0s; }
    .reveal-line:nth-child(2) { animation-delay: 0.05s; }
    .reveal-line:nth-child(3) { animation-delay: 0.1s; }
    .reveal-line:nth-child(4) { animation-delay: 0.15s; }
    .reveal-line:nth-child(5) { animation-delay: 0.2s; }
    .reveal-line:nth-child(6) { animation-delay: 0.25s; }
    .reveal-line:nth-child(7) { animation-delay: 0.3s; }
    .reveal-line:nth-child(8) { animation-delay: 0.35s; }
    .reveal-line:nth-child(9) { animation-delay: 0.4s; }
    .reveal-line:nth-child(10) { animation-delay: 0.45s; }
    .reveal-line:nth-child(11) { animation-delay: 0.5s; }
    .reveal-line:nth-child(12) { animation-delay: 0.55s; }
    .reveal-line:nth-child(13) { animation-delay: 0.6s; }
    .reveal-line:nth-child(14) { animation-delay: 0.65s; }
    .reveal-line:nth-child(15) { animation-delay: 0.7s; }
    .reveal-line:nth-child(16) { animation-delay: 0.75s; }
    .reveal-line:nth-child(17) { animation-delay: 0.8s; }
    .reveal-line:nth-child(18) { animation-delay: 0.85s; }
    .reveal-line:nth-child(19) { animation-delay: 0.9s; }
    .reveal-line:nth-child(20) { animation-delay: 0.95s; }
    .reveal-line:nth-child(n+21) { animation-delay: 1s; }
    .reveal-line { margin-top: 3px; }
    .reveal-line:first-child { margin-top: 0; }
    .reveal-line .section { margin-top: 0; }
    /* Section heading rows get extra breathing room above them.
       Scope the first-child reset to the top-level reveal container only —
       headings that are first-child of a sectionClass wrapper (e.g. red-flags-section)
       should still get the gap from the previous section's last bullet. */
    .reveal-line:has(.h) { margin-top: 22px; }
    .summary-content-reveal > .reveal-line:first-child { margin-top: 0; }
    @keyframes slide-up-fade {
      0% { transform: translateY(8px); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }
    .loading-title-viewport {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      height: 20px;
      position: relative;
    }
    .loading-title-strip {
      display: flex;
      flex-direction: column;
      transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
    }
    .loading-title-strip.loading-to-summarizing {
      transform: translateY(-50%);
    }
    .loading-title-item {
      height: 20px;
      display: flex;
      align-items: center;
      flex-shrink: 0;
      font-size: 12px;
      color: rgba(226,232,240,0.9);
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 290px;
    }
    .loading-title-item:first-child {
      animation: loading-title-slide-up 0.6s cubic-bezier(0.32, 0.72, 0, 1) forwards;
    }
    @keyframes loading-title-slide-up {
      0% { transform: translateY(100%); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }
  `;

  const popover = document.createElement("div");
  popover.className = "popover";
  popover.style.display = "none";

  shadow.append(style, popover);
  document.documentElement.appendChild(host);

  return { host, shadow, popover };
}

const UI = createUi();
let current = {
  anchor: null,
  url: null,
  originalHref: null,  // The actual href attribute for "View source" link
  hoverTimer: null,
  requestId: 0,
  isModalContent: false,  // Track if current content is from an in-page modal
  lastSummary: null,
  lastSummaryUrl: null,
  lastSummaryFromCache: false
};

function clearSummarySnapshot() {
  current.lastSummary = null;
  current.lastSummaryUrl = null;
  current.lastSummaryFromCache = false;
}

function setPopoverPositionNearAnchor(anchor) {
  const rect = anchor.getBoundingClientRect();
  const padding = 10;
  const vpW = window.innerWidth;
  const vpH = window.innerHeight;

  // default right/below the link
  const desiredLeft = rect.left + Math.min(rect.width, 40) + 12;
  const desiredTop = rect.top + rect.height + 10;

  UI.popover.style.display = "block";
  UI.popover.style.left = "0px";
  UI.popover.style.top = "0px";

  // measure after rendering
  const popRect = UI.popover.getBoundingClientRect();
  const popWidth = popRect.width;
  const popHeight = popRect.height;
  
  // Calculate horizontal position - ensure fully visible
  let left = desiredLeft;
  const rightEdge = left + popWidth;
  
  if (rightEdge > vpW - padding) {
    // Doesn't fit on right, try left side
    left = rect.left - popWidth - 12;
    if (left < padding) {
      // Still doesn't fit, position to fit within viewport
      left = Math.max(padding, vpW - popWidth - padding);
    }
  }
  
  // Ensure left edge is visible
  if (left < padding) {
    left = padding;
  }
  
  // Calculate vertical position - ensure fully visible
  let top = desiredTop;
  const bottomEdge = top + popHeight;
  
  if (bottomEdge > vpH - padding) {
    // Doesn't fit below, try above
    top = rect.top - popHeight - 10;
    if (top < padding) {
      // Still doesn't fit, position to fit within viewport
      top = Math.max(padding, vpH - popHeight - padding);
    }
  }
  
  // Ensure top edge is visible
  if (top < padding) {
    top = padding;
  }
  
  // Final check: ensure both edges are within bounds
  if (left + popWidth > vpW - padding) {
    left = vpW - popWidth - padding;
  }
  if (top + popHeight > vpH - padding) {
    top = vpH - popHeight - padding;
  }

  UI.popover.style.left = `${left}px`;
  UI.popover.style.top = `${top}px`;
}

const LOADING_DOTS = '<span class="loading-dots"><span>.</span><span>.</span><span>.</span><span>.</span></span>';

const TICK_SVG = `<svg class="chip-tick" width="8" height="8" viewBox="0 0 8 8" fill="none"><polyline points="1,4 3.2,6.5 7,1.5" stroke="rgba(134,239,172,0.95)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const EMPTY_SVG = `<div class="chip-empty" style="width:8px;height:8px;"></div>`;

function renderFooterQuickPrefs() {
  const rfActive = preferences.showRedFlags;
  const sqActive = preferences.showQuotes;
  return `
    <div class="footer-quick-prefs">
      <div class="footer-pref-row">
        <button type="button" class="footer-pref-toggle${rfActive ? " active" : ""}" data-action="toggle-pref" data-pref="showRedFlags" aria-pressed="${rfActive ? "true" : "false"}" title="Show red flags in summary">
          <span class="chip-icon">${TICK_SVG}${EMPTY_SVG}</span>
        </button>
        <span class="footer-pref-label">🚩 Red flags</span>
      </div>
      <div class="footer-pref-row">
        <button type="button" class="footer-pref-toggle${sqActive ? " active" : ""}" data-action="toggle-pref" data-pref="showQuotes" aria-pressed="${sqActive ? "true" : "false"}" title="Show supporting quotes">
          <span class="chip-icon">${TICK_SVG}${EMPTY_SVG}</span>
        </button>
        <span class="footer-pref-label">💬 Quotes</span>
      </div>
    </div>
  `;
}
const EXTENSION_LOGO_URL = (() => { try { return chrome.runtime.getURL("icons/icon48.png"); } catch (e) { return ""; } })();
/** Square tile grid — reads “settings / menu” without a circular gear */
const SETTINGS_TILE_ICON = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="7" height="7" rx="1.75"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.75"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.75"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.75"/></svg>`;
const COPY_SUMMARY_SVG = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`;

async function renderLoading(url) {
  clearSummarySnapshot();
  const footer = await getStatsFooter();
  UI.popover.innerHTML = `
    <div class="header">
      <div class="loading-title-viewport">
        <div class="loading-title-strip" data-loading-phase="thinking">
          <div class="loading-title-item">Thinking${LOADING_DOTS}</div>
          <div class="loading-title-item">Summarising${LOADING_DOTS}</div>
        </div>
      </div>
      <div class="header-right"></div>
    </div>
    <div class="section muted" style="margin-top:8px;">
      Fetching <span title="${escapeHtml(url)}">${escapeHtml(truncateUrl(url))}</span>
    </div>
    <div class="td-loading-bar" role="progressbar" aria-label="Summarising" aria-busy="true">
      <div class="td-loading-bar-fill"></div>
    </div>
    <div class="divider"></div>
    <div class="section muted" style="padding-bottom: 12px; margin-top: 0;">Keep your mouse over the popover to view the summary.</div>
    ${footer}
  `;

  // After 1.7 seconds, animate "Summarizing" up from bottom, pushing "Thinking" out (if still loading)
  setTimeout(() => {
    const stripEl = UI.popover?.querySelector(".loading-title-strip[data-loading-phase='thinking']");
    if (stripEl) {
      stripEl.classList.add("loading-to-summarizing");
      stripEl.setAttribute("data-loading-phase", "summarizing");
    }
  }, 1700);
}

function truncateUrl(url, maxLen = 50) {
  if (url.length <= maxLen) return url;
  return url.slice(0, maxLen - 3) + "…";
}

// Get usage stats and render footer
// isSummaryView: true → quick prefs row + copy icon beside settings tile
async function getStatsFooter(currentSummaryUrl = null, isSummaryView = false) {
  const quickPrefs = isSummaryView ? renderFooterQuickPrefs() : "";

  if (!isExtensionContextValid()) {
    return `
      ${quickPrefs}
      <div class="footer-stats">
        <div class="footer-brand-settings">
          <div class="footer-brand">
            ${EXTENSION_LOGO_URL ? `<img src="${EXTENSION_LOGO_URL}" alt="" />` : ""}
            <span>TermsDigest</span>
          </div>
          <a class="footer-settings" data-action="open-options" title="Open extension options">
            ${SETTINGS_TILE_ICON}
          </a>
          ${isSummaryView ? `<button type="button" class="footer-copy-btn" data-action="copy-summary" title="Copy summary to clipboard">${COPY_SUMMARY_SVG}</button>` : ""}
        </div>
      </div>
    `;
  }
  try {
    const data = await chrome.storage.local.get([
      "usageStats",
      "summariesCache",
      "monthlyUsage",
      "subscriptionPlan"
    ]);

    const stats = data.usageStats || { totalSummaries: 0 };
    const cache = data.summariesCache || {};
    const monthlyUsage = data.monthlyUsage ?? stats.totalSummaries ?? 0;
    const plan = data.subscriptionPlan || "free";

    // Determine quota based on plan
    let quota = 5;
    if (plan === "pro") quota = 50;
    else if (plan === "enterprise") quota = 5000;

    // Calculate minutes saved for current summary only
    let minutesSaved = 0;
    if (currentSummaryUrl && cache) {
      const normalizedUrl = currentSummaryUrl.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();
      const possibleKeys = [
        `summary:${normalizedUrl}`,
        `summary:${currentSummaryUrl}`,
        `summary:${currentSummaryUrl.toLowerCase()}`
      ];
      const matchingKey = possibleKeys.find(key => cache[key]) ||
        Object.keys(cache).find(key => {
          if (!key.startsWith("summary:")) return false;
          const keyUrl = key.replace(/^summary:/, "").toLowerCase();
          return keyUrl === normalizedUrl ||
                 keyUrl.includes(normalizedUrl) ||
                 normalizedUrl.includes(keyUrl) ||
                 keyUrl.split("#")[0] === normalizedUrl.split("#")[0];
        });
      if (matchingKey && cache[matchingKey]?.originalTextLength) {
        const words = Math.floor(cache[matchingKey].originalTextLength / 5);
        minutesSaved = Math.floor(words / 200);
      }
    }

    return `
      ${quickPrefs}
      <div class="footer-stats">
        <div class="footer-stat">
          <span class="footer-stat-value">${monthlyUsage}/${quota}</span>
          <span class="footer-stat-label">Used</span>
        </div>
        <div class="footer-stat">
          <span class="footer-stat-value">~${minutesSaved}</span>
          <span class="footer-stat-label">Mins saved</span>
        </div>
        <div class="footer-brand-settings">
          <div class="footer-brand">
            ${EXTENSION_LOGO_URL ? `<img src="${EXTENSION_LOGO_URL}" alt="" />` : ""}
            <span>TermsDigest</span>
          </div>
          <a class="footer-settings" data-action="open-options" title="Open extension options">
            ${SETTINGS_TILE_ICON}
          </a>
          ${isSummaryView ? `<button type="button" class="footer-copy-btn" data-action="copy-summary" title="Copy summary to clipboard">${COPY_SUMMARY_SVG}</button>` : ""}
        </div>
      </div>
    `;
  } catch (e) {
    if (!isContextInvalidatedError(e)) {
      console.warn("[TermsDigest] Could not load stats:", e);
    }
    return `
      ${quickPrefs}
      <div class="footer-stats">
        <div class="footer-brand-settings">
          <div class="footer-brand">
            ${EXTENSION_LOGO_URL ? `<img src="${EXTENSION_LOGO_URL}" alt="" />` : ""}
            <span>TermsDigest</span>
          </div>
          <a class="footer-settings" data-action="open-options" title="Open extension options">
            ${SETTINGS_TILE_ICON}
          </a>
          ${isSummaryView ? `<button type="button" class="footer-copy-btn" data-action="copy-summary" title="Copy summary to clipboard">${COPY_SUMMARY_SVG}</button>` : ""}
        </div>
      </div>
    `;
  }
}

async function renderError(errMsg, url) {
  clearSummarySnapshot();
  const msg = errMsg || "Unknown error";
  
  // Check subscription status for Pro users
  let isProUser = false;
  let hasOpenAIKey = false;
  if (isExtensionContextValid()) {
    try {
      const data = await chrome.storage.local.get(["subscription", "subscriptionPlan", "openaiApiKey"]);
      isProUser = (data.subscription === "active" && data.subscriptionPlan === "pro") || data.subscriptionPlan === "pro";
      hasOpenAIKey = !!data.openaiApiKey && data.openaiApiKey.trim().length > 0;
    } catch (e) {
      if (!isContextInvalidatedError(e)) {
        console.warn("[TermsDigest] Could not check subscription status:", e);
      }
    }
  }
  
  // Determine error type and icon
  let displayMsg = msg;
  let errorIcon = "⚠️";
  let headerTitle = "Summary unavailable";
  let showUpgradeButton = false;
  let showRefreshButton = false;
  let isSignInIssue = false;
  let isProQuotaExceeded = false;
  let isInfoNotice = false;

  if (msg === "UNREADABLE_PAGE" || msg.includes("Could not extract readable text")) {
    // Friendly notice for pages we can't summarise (single-page apps, paywalls,
    // anti-bot pages, login-walled content). No byte counts, no "blocked" wording.
    displayMsg = "We couldn't read this page automatically. You can still open it to read it yourself.";
    errorIcon = "ℹ️";
    headerTitle = "Nothing to summarise";
    isInfoNotice = true;
  } else if (isContextInvalidatedError({ message: msg })) {
    displayMsg = "Extension needs a page refresh to continue";
    errorIcon = "⚠️";
    headerTitle = "Summary unavailable";
    showRefreshButton = true;
  } else if (msg.includes("No API access") || msg.includes("Please login") || msg.includes("sign in")) {
    displayMsg = "Please sign in to continue";
    errorIcon = "🔒";
    headerTitle = "Sign in required";
    isSignInIssue = true;
  } else if (msg.includes("Quota exceeded") || msg.includes("quotaExceeded")) {
    if (isProUser && hasOpenAIKey) {
      // Pro user with API key - should work automatically, don't show error
      // This case shouldn't happen, but if it does, just return early
      return;
    } else if (isProUser) {
      // Pro user without API key hit quota
      isProQuotaExceeded = true;
      displayMsg = "Monthly limit reached. Add your OpenAI API key for unlimited summaries, or contact support.";
      errorIcon = "⚠️";
      headerTitle = "Usage limit reached";
    } else {
      // Free user hit quota
      displayMsg = "You've hit your usage limit";
      errorIcon = "⚠️";
      headerTitle = "Usage limit reached";
      showUpgradeButton = true;
    }
  } else if (msg.includes("Session expired") || msg.includes("Invalid JWT") || msg.includes("401") || msg.includes("Unauthorized")) {
    displayMsg = "Session expired";
    errorIcon = "🔒";
    headerTitle = "Sign in required";
    isSignInIssue = true;
  }
  
  // Build buttons based on error type
  let buttonsHtml;
  if (showRefreshButton) {
    buttonsHtml = `
      <button data-action="refresh-page">Refresh page</button>
      <button data-action="open-link">View page</button>
    `;
  } else if (isProQuotaExceeded) {
    // Pro user without API key - show add key or contact support
    buttonsHtml = `
      <button class="primary" data-action="open-options">Add API Key</button>
      <button data-action="open-support">Contact Support</button>
    `;
  } else if (showUpgradeButton) {
    buttonsHtml = `
      <button class="primary" data-action="upgrade-to-pro">Upgrade to Pro</button>
      <button data-action="open-options">Open Options</button>
    `;
  } else if (isSignInIssue) {
    buttonsHtml = `
      <button data-action="open-options">Sign in</button>
      <button data-action="open-link">View page</button>
    `;
  } else if (isInfoNotice) {
    buttonsHtml = `
      <button data-action="open-link">View page</button>
    `;
  } else {
    buttonsHtml = `
      <button data-action="open-options">Open Options</button>
      <button data-action="open-link">View page</button>
    `;
  }

  // Info notices get a softer style + an "info" badge instead of an alert banner.
  const banner = isInfoNotice
    ? `
      <div class="section muted" style="margin-top:8px;display:flex;gap:8px;align-items:flex-start;">
        <span style="font-size:14px;line-height:1.4;">${errorIcon}</span>
        <span>${escapeHtml(displayMsg)}</span>
      </div>
    `
    : `
      <div class="error-banner">
        <span class="error-icon">${errorIcon}</span>
        <span>${escapeHtml(displayMsg)}</span>
      </div>
    `;

  const headerExtra = isInfoNotice
    ? `<div class="header-right"><div class="badge">info</div></div>`
    : "";

  const footer = await getStatsFooter();
  UI.popover.innerHTML = `
    <div class="header">
      <button type="button" class="popover-close" data-action="close-popover" title="Close" aria-label="Close">x</button>
      <div class="title">${escapeHtml(headerTitle)}</div>
      ${headerExtra}
    </div>
    ${banner}
    <div class="buttons">
      ${buttonsHtml}
    </div>
    ${footer}
  `;
}

async function renderClickToLoad(element) {
  const linkText = (element.textContent || "").trim();
  const footer = await getStatsFooter();
  UI.popover.innerHTML = `
    <div class="header">
      <button type="button" class="popover-close" data-action="close-popover" title="Close" aria-label="Close">x</button>
      <div class="title">Click to load content</div>
      <div class="header-right">
        <div class="badge">info</div>
      </div>
    </div>
    <div class="section muted" style="margin-top:8px;">
      The content for "${escapeHtml(linkText)}" is loaded dynamically.
    </div>
    <div class="buttons">
      <button data-action="click-and-retry">Click to open & summarize</button>
    </div>
    <div class="section muted" style="margin-top:8px;">
      This will click the button to load the content, then summarize it.
    </div>
    ${footer}
  `;
}

function getConfidenceTooltip(confidence) {
  const tips = {
    high: "High confidence: Clear, well-structured legal text found",
    medium: "Medium confidence: Reasonable summary but some parts may be unclear",
    low: "Low confidence: AI struggled with this page — verify manually"
  };
  return tips[confidence] || tips.medium;
}

async function renderSummary(summary, url, fromCache) {
  current.lastSummary = summary;
  current.lastSummaryUrl = url;
  current.lastSummaryFromCache = !!fromCache;

  const headerUtils =
    (typeof globalThis !== "undefined" && globalThis.TermsDigestSummaryHeaderUtils) ||
    null;
  const title = headerUtils?.resolveSummaryTitle
    ? headerUtils.resolveSummaryTitle(summary)
    : (typeof summary?.title === "string" && summary.title.trim() ? summary.title.trim() : "Summary");
  const confidence = summary?.confidence || "medium";
  const badgeText = headerUtils?.resolveConfidenceBadgeText
    ? headerUtils.resolveConfidenceBadgeText(confidence, !!fromCache)
    : (fromCache ? `${confidence} • cached` : confidence);
  const badgeTooltip = getConfidenceTooltip(confidence);
  const badgeColorClass = confidence === "high" ? "badge-high" : confidence === "low" ? "badge-low" : "badge-medium";
  const footer = await getStatsFooter(url, true);

  UI.popover.innerHTML = `
    <div class="header">
      <button type="button" class="popover-close" data-action="close-popover" title="Close" aria-label="Close">x</button>
      <div class="title" title="${escapeAttr(title)}">${escapeHtml(title)}</div>
      <div class="header-right">
        <span class="confidence-label">Confidence:</span>
        <div class="badge ${badgeColorClass}" title="${escapeAttr(badgeTooltip)}">${escapeHtml(badgeText)}</div>
      </div>
    </div>
    <div class="summary-content-reveal">
      <div class="reveal-line"><div class="section"><div class="h">Quick Summary</div></div></div>
      <div class="reveal-line"><div class="section"><div class="muted">${escapeHtml(summary?.tldr || "")}</div></div></div>
      ${renderListSection("💰 Costs & renewal", summary?.costs_and_renewal)}
      ${renderListSection("↩️ Cancellation & refunds", summary?.cancellation_and_refunds)}
      ${renderListSection("⚖️ Liability & disputes", summary?.liability_and_disputes)}
      ${renderListSection("🔒 Privacy & data", summary?.privacy_and_data)}
      ${preferences.showRedFlags ? renderListSection("🚩 Red flags", summary?.red_flags, "red-flags-section") : ""}
      ${preferences.showQuotes ? renderQuotes(summary?.quotes) : ""}
      <div class="reveal-line"><div class="divider"></div></div>
      <div class="reveal-line"><div class="section muted" style="padding-bottom: 4px; margin-top: 0;">
        Note: This is an automated summary. <a class="link" data-action="view-source" href="${escapeAttr(url)}" target="_blank" rel="noreferrer">View full content</a>.
      </div></div>
      <div class="reveal-line">${footer}</div>
    </div>
  `;
}

function renderListSection(title, items, sectionClass) {
  const arr = Array.isArray(items) ? items.filter((x) => typeof x === "string" && x.trim()) : [];
  if (!arr.length) return "";
  const inner = `
    <div class="reveal-line"><div class="section"><div class="h">${escapeHtml(title)}</div></div></div>
    ${arr.slice(0, 6).map((x) => `<div class="reveal-line"><div class="section"><ul><li>${escapeHtml(x)}</li></ul></div></div>`).join("")}
  `;
  return sectionClass ? `<div class="${sectionClass}">${inner}</div>` : inner;
}

function renderQuotes(quotes) {
  const arr = Array.isArray(quotes) ? quotes : [];
  const cleaned = arr
    .map((q) => ({
      quote: typeof q?.quote === "string" ? q.quote.trim() : "",
      why: typeof q?.why_it_matters === "string" ? q.why_it_matters.trim() : ""
    }))
    .filter((q) => q.quote);
  if (!cleaned.length) return "";
  const items = cleaned.slice(0, 3).map((q) =>
    `<li><span class="muted">"${escapeHtml(q.quote)}"</span>${q.why ? ` — ${escapeHtml(q.why)}` : ""}</li>`
  );
  return `
    <div class="reveal-line"><div class="section"><div class="h">Supporting quotes</div></div></div>
    ${items.map((li) => `<div class="reveal-line"><div class="section"><ul>${li}</ul></div></div>`).join("")}
  `;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(s) {
  return escapeHtml(s).replaceAll("\n", " ");
}

function showPopover(anchor) {
  UI.popover.style.display = "block";
  setPopoverPositionNearAnchor(anchor);
  // Recalculate position after content is fully rendered to ensure it stays in view
  setTimeout(() => {
    if (current.anchor === anchor && UI.popover.style.display === "block") {
      setPopoverPositionNearAnchor(anchor);
    }
  }, 10);
}

function hidePopover() {
  UI.popover.style.display = "none";
  UI.popover.innerHTML = "";
  clearSummarySnapshot();
}

async function summarizeModal(modalSelector, anchor, requestId) {
  await loadPreferences();
  const displayUrl = window.location.href;
  renderLoading(displayUrl + " (in-page modal)");
  showPopover(anchor);

  // Find the modal element on the page
  const modal = document.querySelector(modalSelector);
  if (!modal) {
    throw new Error(`Could not find modal element "${modalSelector}" on this page.`);
  }

  // Extract text from the modal
  const text = (modal.innerText || modal.textContent || "")
    .replace(/\s+/g, " ")
    .trim();

  if (!text || text.length < 50) {
    throw new Error("Modal appears to be empty or has very little content.");
  }

  if (current.requestId !== requestId) return;

  // Use anchor text/ID for unique cache key
  const anchorText = (anchor.textContent || "").trim().toLowerCase().replace(/\s+/g, "-").slice(0, 50);
  const anchorId = anchor.getAttribute("id") || "";
  const cacheKey = `${displayUrl}#link:${anchorId || anchorText}`;

  const sumRes = await chrome.runtime.sendMessage({
    type: "summarize_text",
    url: cacheKey,
    text
  });

  if (current.requestId !== requestId) return;

  if (!sumRes?.ok) throw new Error(sumRes?.error || "Summarization failed.");

  current.isModalContent = true;  // Mark as modal content
  renderSummary(sumRes.summary, displayUrl, !!sumRes.fromCache);
  showPopover(anchor);
}

async function summarizeModalElement(modalElement, anchor, requestId) {
  await loadPreferences();
  const displayUrl = window.location.href;
  renderLoading(displayUrl + " (in-page content)");
  showPopover(anchor);

  if (!modalElement) {
    throw new Error("Could not find modal content on this page.");
  }

  // Extract text from the modal element
  // Remove script/style elements first
  const clone = modalElement.cloneNode(true);
  clone.querySelectorAll("script, style, noscript").forEach((el) => el.remove());
  
  const text = (clone.innerText || clone.textContent || "")
    .replace(/\s+/g, " ")
    .trim();

  if (!text || text.length < 50) {
    throw new Error("Content appears to be empty or has very little text.");
  }

  if (current.requestId !== requestId) return;

  // Use anchor text/ID for unique cache key (not modal container which might be shared)
  const anchorText = (anchor.textContent || "").trim().toLowerCase().replace(/\s+/g, "-").slice(0, 50);
  const anchorId = anchor.getAttribute("id") || "";
  const cacheKey = `${displayUrl}#link:${anchorId || anchorText}`;
  
  const sumRes = await chrome.runtime.sendMessage({
    type: "summarize_text",
    url: cacheKey,
    text
  });

  if (current.requestId !== requestId) return;

  if (!sumRes?.ok) throw new Error(sumRes?.error || "Summarization failed.");

  current.isModalContent = true;  // Mark as modal content
  renderSummary(sumRes.summary, displayUrl, !!sumRes.fromCache);
  showPopover(anchor);
}

async function summarizeLink(url, anchor, requestId) {
  await loadPreferences();
  renderLoading(url);
  showPopover(anchor);

  const fetchRes = await chrome.runtime.sendMessage({ type: "fetch_html", url });
  if (!fetchRes?.ok) throw new Error(fetchRes?.error || "Failed to fetch page HTML.");

  const { result } = fetchRes;
  if (!result?.ok) {
    throw new Error(`Fetch failed (${result?.status || "?"}). This site may block automated access.`);
  }

  if (current.requestId !== requestId) return; // cancelled/replaced

  const text = extractTextFromHtml(result.html, result.finalUrl);
  if (!text.trim()) {
    // Tagged so renderError can show this as a friendly info message rather than
    // a scary technical error. Don't include byte counts or "JavaScript / blocked"
    // wording in the user-facing string.
    throw new Error("UNREADABLE_PAGE");
  }

  const sumRes = await chrome.runtime.sendMessage({
    type: "summarize_text",
    url: result.finalUrl || url,
    text
  });

  if (current.requestId !== requestId) return; // cancelled/replaced

  if (!sumRes?.ok) throw new Error(sumRes?.error || "Summarization failed.");

  current.isModalContent = false;  // This is URL-based content, not modal
  renderSummary(sumRes.summary, result.finalUrl || url, !!sumRes.fromCache);
  showPopover(anchor);
}

function clearHoverTimer() {
  if (current.hoverTimer) window.clearTimeout(current.hoverTimer);
  current.hoverTimer = null;
}

function startHover(element) {
  clearHoverTimer();
  const linkInfo = getUrlFromElement(element);
  if (!linkInfo) return;

  current.anchor = element;
  current.requestId += 1;
  const requestId = current.requestId;
  
  // Store original href for "View source" link
  const originalHref = element.getAttribute("href") || element.getAttribute("data-href") || "";
  current.originalHref = originalHref ? toAbsoluteUrl(originalHref) : null;

  if (linkInfo.type === "modal") {
    // Handle in-page modal content (Bootstrap-style with selector)
    current.url = window.location.href + linkInfo.value;
    current.hoverTimer = window.setTimeout(() => {
      summarizeModal(linkInfo.value, element, requestId).catch((e) => {
        if (current.requestId !== requestId) return;
        renderError(e?.message || String(e), current.url);
        showPopover(element);
      });
    }, HOVER_DELAY_MS);
  } else if (linkInfo.type === "modal-element") {
    // Handle JavaScript-triggered modal (found DOM element directly)
    current.url = window.location.href;
    current.hoverTimer = window.setTimeout(() => {
      summarizeModalElement(linkInfo.value, element, requestId).catch((e) => {
        if (current.requestId !== requestId) return;
        renderError(e?.message || String(e), current.url);
        showPopover(element);
      });
    }, HOVER_DELAY_MS);
  } else if (linkInfo.type === "click-to-load") {
    // Content needs to be loaded by clicking first
    current.url = window.location.href;
    current.isModalContent = true;
    current.hoverTimer = window.setTimeout(() => {
      renderClickToLoad(element);
      showPopover(element);
    }, HOVER_DELAY_MS);
  } else if (linkInfo.type === "url") {
    // Handle external URL
    const abs = toAbsoluteUrl(linkInfo.value);
    if (!abs) return;
    current.url = abs;
    current.hoverTimer = window.setTimeout(() => {
      summarizeLink(abs, element, requestId).catch((e) => {
        if (current.requestId !== requestId) return;
        renderError(e?.message || String(e), abs);
        showPopover(element);
      });
    }, HOVER_DELAY_MS);
  }
}

function closePopover() {
  clearHoverTimer();
  current.requestId += 1; // cancel inflight
  current.anchor = null;
  current.url = null;
  hidePopover();
}

function findLegalAnchorFromEventTarget(target) {
  if (!target || !target.closest) return null;
  const el = target.closest('a, button, [role="link"], [role="button"]');
  if (!el || !isLikelyLegalLink(el)) return null;
  return el;
}

// Desktop: hover to trigger. Touch/iOS uses tap path below instead.
document.addEventListener(
  "mouseover",
  (e) => {
    if (!UI.host) return;
    if (TOUCH_SUMMARIZE) return; // avoid hover+tap double-fire on touch laptops/tablets
    if (!preferences.autoHover) return;

    const el = findLegalAnchorFromEventTarget(e.target);
    if (!el) return;

    // Don't restart if already showing for this element
    if (current.anchor === el && UI.popover.style.display === "block") return;

    startHover(el);
  },
  true
);

// Once the popover is open it stays open — user must click outside or use the ✕ button.
// We still cancel the hover timer if the mouse leaves the anchor before it fires.
document.addEventListener(
  "mouseout",
  (e) => {
    if (!UI.host || TOUCH_SUMMARIZE) return;
    const el = findLegalAnchorFromEventTarget(e.target);
    // Only cancel a pending (not-yet-shown) timer; if the popover is already visible, do nothing.
    if (el && el === current.anchor && UI.popover.style.display !== "block") {
      clearHoverTimer();
    }
  },
  true
);

// Touch / iOS Safari: tap a legal link to summarize (hover is unreliable).
// First tap opens the summary; use "View source" in the popover to open the real page.
document.addEventListener(
  "click",
  (e) => {
    if (!UI.host || !TOUCH_SUMMARIZE) return;
    if (!preferences.autoHover) return;
    if (UI.host === e.target || UI.host.contains(e.target)) return;

    const el = findLegalAnchorFromEventTarget(e.target);
    if (!el) return;

    // Already open for this anchor — let outside-click handler / popover handle it
    if (current.anchor === el && UI.popover.style.display === "block") {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    const prevDelay = HOVER_DELAY_MS;
    HOVER_DELAY_MS = 0;
    startHover(el);
    HOVER_DELAY_MS = prevDelay;
  },
  true
);

// Click-outside closes the popover.
// Clicks inside the shadow DOM bubble up with e.target === UI.host (the shadow host),
// so we explicitly ignore those — they are handled by the popover's own click listener.
document.addEventListener(
  "click",
  (e) => {
    if (!UI.host) return;
    if (UI.popover.style.display !== "block") return;
    if (UI.host === e.target || UI.host.contains(e.target)) return;
    // Touch path already handled legal-link taps above; don't immediately close
    if (TOUCH_SUMMARIZE && findLegalAnchorFromEventTarget(e.target)) return;
    closePopover();
  },
  true
);

// Handle button and link clicks inside the popover
UI.popover.addEventListener("click", (e) => {
  // Check for buttons
  const btn = e.target && e.target.closest ? e.target.closest("button") : null;
  if (btn) {
    const action = btn.getAttribute("data-action");
    if (action === "close-popover") {
      e.preventDefault();
      e.stopPropagation();
      closePopover();
      return;
    }
    if (action === "refresh-page") {
      e.preventDefault();
      e.stopPropagation();
      window.location.reload();
      return;
    }
    if (action === "open-options") {
      e.preventDefault();
      e.stopPropagation();
      try {
        chrome.runtime.sendMessage({ type: "open_options" }).catch(() => {});
      } catch (err) {
        if (!isContextInvalidatedError(err)) throw err;
      }
      return;
    }
    if (action === "upgrade-to-pro") {
      e.preventDefault();
      e.stopPropagation();
      try {
        chrome.runtime.sendMessage({ type: "open_options_upgrade" }).catch(() => {});
      } catch (err) {
        if (!isContextInvalidatedError(err)) throw err;
      }
      return;
    }
    if (action === "open-support") {
      e.preventDefault();
      e.stopPropagation();
      window.open("https://termsdigest.com/support", "_blank", "noopener,noreferrer");
      return;
    }
    if (action === "open-link") {
      // Click the original link directly (most reliable)
      if (current.anchor) {
        current.anchor.click();
      } else if (current.originalHref) {
        window.open(current.originalHref, "_blank", "noopener,noreferrer");
      }
    }
    if (action === "copy-summary") {
      e.preventDefault();
      e.stopPropagation();
      if (current.lastSummary) {
        const s = current.lastSummary;
        const lines = [];
        if (s.title) lines.push(s.title);
        if (s.tldr) lines.push("\nQuick Summary\n" + s.tldr);
        const addSection = (heading, arr) => {
          if (!Array.isArray(arr) || !arr.length) return;
          lines.push("\n" + heading);
          arr.forEach(x => lines.push("• " + x));
        };
        addSection("Costs & renewal", s.costs_and_renewal);
        addSection("Cancellation & refunds", s.cancellation_and_refunds);
        addSection("Liability & disputes", s.liability_and_disputes);
        addSection("Privacy & data", s.privacy_and_data);
        if (preferences.showRedFlags) addSection("Red flags", s.red_flags);
        if (preferences.showQuotes && Array.isArray(s.quotes)) {
          const validQuotes = s.quotes.filter(q => q?.quote);
          if (validQuotes.length) {
            lines.push("\nSupporting quotes");
            validQuotes.slice(0, 3).forEach(q => lines.push(`"${q.quote}"${q.why_it_matters ? " — " + q.why_it_matters : ""}`));
          }
        }
        if (current.lastSummaryUrl) lines.push("\nSource: " + current.lastSummaryUrl);
        navigator.clipboard.writeText(lines.join("\n")).then(() => {
          btn.classList.add("copied");
          setTimeout(() => btn.classList.remove("copied"), 1600);
        }).catch(() => {});
      }
      return;
    }
    if (action === "toggle-pref") {
      e.preventDefault();
      e.stopPropagation();
      const key = btn.getAttribute("data-pref");
      if (key === "showRedFlags" || key === "showQuotes") {
        preferences[key] = !preferences[key];
        // Persist to storage (same format options.js uses)
        if (isExtensionContextValid()) {
          chrome.storage.local.get("preferences").then(d => {
            const saved = { ...(d.preferences || {}), [key]: preferences[key] };
            return chrome.storage.local.set({ preferences: saved });
          }).catch(() => {});
        }
        // Re-render summary immediately
        if (current.lastSummary) {
          renderSummary(current.lastSummary, current.lastSummaryUrl, current.lastSummaryFromCache)
            .then(() => { if (current.anchor) showPopover(current.anchor); })
            .catch(() => {});
        }
      }
      return;
    }
    if (action === "click-and-retry" && current.anchor) {
      // Click the original button to load content
      current.anchor.click();
      // Wait for content to load, then try to find and summarize it
      renderLoading(window.location.href + " (loading content...)");
      setTimeout(() => {
        const modalContent = findModalContent(current.anchor);
        if (modalContent) {
          const requestId = ++current.requestId;
          summarizeModalElement(modalContent, current.anchor, requestId).catch((err) => {
            renderError(err?.message || String(err), current.url);
          });
        } else {
          renderError("Content still not found after clicking. The page may use a different loading mechanism.", current.url);
        }
      }, 1500); // Wait 1.5 seconds for content to load
    }
    return;
  }
  
  // Check for links with data-action
  const link = e.target && e.target.closest ? e.target.closest("a[data-action]") : null;
  if (link) {
    const action = link.getAttribute("data-action");
    if (action === "view-source") {
      e.preventDefault();
      // For modal content, click the original anchor to open the modal
      if (current.isModalContent && current.anchor) {
        current.anchor.click();
      } else if (current.originalHref) {
        // Use the original href (not the internal cache URL)
        window.open(current.originalHref, "_blank", "noopener,noreferrer");
      } else if (current.anchor) {
        // Fallback: click the anchor directly
        current.anchor.click();
      }
    } else if (action === "open-options") {
      e.preventDefault();
      e.stopPropagation();
      try {
        chrome.runtime.sendMessage({ type: "open_options" }).catch(() => {});
      } catch (err) {
        if (!isContextInvalidatedError(err)) throw err;
      }
      return;
    }
  }
  
  // Also check if clicking directly on footer settings icon
  const footerSettings = e.target && e.target.closest ? e.target.closest(".footer-settings") : null;
  if (footerSettings) {
    e.preventDefault();
    e.stopPropagation();
    try {
      chrome.runtime.sendMessage({ type: "open_options" }).catch(() => {});
    } catch (err) {
      if (!isContextInvalidatedError(err)) throw err;
    }
    return;
  }
});


// ========================================
// AUTO-HIGHLIGHT DETECTED LEGAL LINKS
// ========================================

// Track highlighted elements to avoid re-processing
const highlightedElements = new WeakSet();

// Inject highlight styles into the main document
function injectHighlightStyles() {
  if (document.getElementById("termsdigest-highlight-styles")) return;
  
  const style = document.createElement("style");
  style.id = "termsdigest-highlight-styles";
  style.textContent = `
    /* TermsDigest link highlight - animated underline */
    .td-highlighted {
      position: relative;
      display: inline;
      text-decoration: none !important;
    }
    
    /* Animated underline that draws from left to right */
    .td-highlighted::after {
      content: '';
      position: absolute;
      left: 0;
      bottom: 0;
      width: 100%;
      height: 0.5px;
      background: currentColor;
      transform-origin: left center;
      animation: td-underline-draw 3s linear infinite;
    }
    
    @keyframes td-underline-draw {
      0% {
        transform: scaleX(0);
        transform-origin: left center;
      }
      12% {
        transform: scaleX(1);
        transform-origin: left center;
      }
      12.1% {
        transform-origin: right center;
      }
      24% {
        transform: scaleX(0);
        transform-origin: right center;
      }
      100% {
        transform: scaleX(0);
        transform-origin: right center;
      }
    }

    /* Two-pulse orange glow. The first pair runs on viewport entry; JS replays
       the same short animation once more after 30s, instead of keeping a long
       CSS animation active on every detected link. */
    .td-glow-once {
      animation: td-glow-pulse 3.4s ease-in-out 1;
    }

    /* Orange→coral: #c2410c / #ea580c / #f97316 / #fb923c / #ff7047 */
    @keyframes td-glow-pulse {
      /* invisible — mirror layer count so interpolation stays stable */
      0%, 100% {
        text-shadow:
          0 0 0 rgba(234, 88, 12, 0),
          0 0 0 rgba(249, 115, 22, 0),
          0 0 0 rgba(251, 146, 60, 0),
          0 0 0 rgba(255, 112, 67, 0),
          0 0 0 rgba(249, 115, 22, 0),
          0 0 0 rgba(255, 138, 91, 0);
      }
      /* ─── pulse 1 ─── */
      5.88% {
        text-shadow:
          0 0 1px  rgba(194, 65, 12, 1),
          0 0 2px  rgba(234, 88, 12, 1),
          0 0 3px  rgba(249, 115, 22, 1),
          0 0 5px  rgba(251, 146, 60, 0.98),
          0 0 8px  rgba(249, 115, 22, 0.92),
          0 0 11px rgba(255, 112, 67, 0.55);
      }
      20.59% {
        text-shadow:
          0 0 1px  rgba(194, 65, 12, 1),
          0 0 2px  rgba(234, 88, 12, 1),
          0 0 3px  rgba(249, 115, 22, 1),
          0 0 5px  rgba(251, 146, 60, 0.98),
          0 0 8px  rgba(249, 115, 22, 0.92),
          0 0 11px rgba(255, 112, 67, 0.55);
      }
      /* pulse 1 fully off — t ≈ 1.00s */
      29.41% {
        text-shadow:
          0 0 0 rgba(234, 88, 12, 0),
          0 0 0 rgba(249, 115, 22, 0),
          0 0 0 rgba(251, 146, 60, 0),
          0 0 0 rgba(255, 112, 67, 0),
          0 0 0 rgba(249, 115, 22, 0),
          0 0 0 rgba(255, 138, 91, 0);
      }

      /* exactly 1.00s gap after pulse 1 */
      58.82% {
        text-shadow:
          0 0 0 rgba(234, 88, 12, 0),
          0 0 0 rgba(249, 115, 22, 0),
          0 0 0 rgba(251, 146, 60, 0),
          0 0 0 rgba(255, 112, 67, 0),
          0 0 0 rgba(249, 115, 22, 0),
          0 0 0 rgba(255, 138, 91, 0);
      }

      /* ─── pulse 2 — starts t ≈ 2.00s ─── */
      58.83% {
        text-shadow:
          0 0 1px  rgba(194, 65, 12, 1),
          0 0 2px  rgba(234, 88, 12, 1),
          0 0 3px  rgba(249, 115, 22, 1),
          0 0 5px  rgba(251, 146, 60, 0.98),
          0 0 8px  rgba(249, 115, 22, 0.92),
          0 0 11px rgba(255, 112, 67, 0.55);
      }
      85.29% {
        text-shadow:
          0 0 1px  rgba(194, 65, 12, 1),
          0 0 2px  rgba(234, 88, 12, 1),
          0 0 3px  rgba(249, 115, 22, 1),
          0 0 5px  rgba(251, 146, 60, 0.98),
          0 0 8px  rgba(249, 115, 22, 0.92),
          0 0 11px rgba(255, 112, 67, 0.55);
      }
      /* pulse 2 off — t ≈ 3.4s */
      100% {
        text-shadow:
          0 0 0 rgba(234, 88, 12, 0),
          0 0 0 rgba(249, 115, 22, 0),
          0 0 0 rgba(251, 146, 60, 0),
          0 0 0 rgba(255, 112, 67, 0),
          0 0 0 rgba(249, 115, 22, 0),
          0 0 0 rgba(255, 138, 91, 0);
      }
    }

    /* Respect users who've opted out of motion. */
    @media (prefers-reduced-motion: reduce) {
      .td-glow-once { animation: none !important; }
    }
  `;
  
  document.head.appendChild(style);
}

const LATE_GLOW_REPLAY_DELAY_MS = 30000;

function prefersReducedMotion() {
  try {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
  } catch (_) {
    return false;
  }
}

function isElementInViewport(element) {
  if (!element || !element.isConnected) return false;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;

  return (
    rect.bottom >= 0 &&
    rect.right >= 0 &&
    rect.top <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.left <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

function playGlowPair(element) {
  if (!element || !element.isConnected || prefersReducedMotion()) return;

  // Remove before re-adding so the same two-pulse animation can replay after
  // the 30s reminder delay. offsetWidth intentionally forces a tiny reflow for
  // this one element only; otherwise browsers may coalesce the class change.
  element.classList.remove("td-glow-once");
  void element.offsetWidth;
  element.classList.add("td-glow-once");

  element.addEventListener(
    "animationend",
    (e) => {
      if (e.animationName === "td-glow-pulse") {
        element.classList.remove("td-glow-once");
      }
    },
    { once: true }
  );
}

// Highlight a legal link element
function highlightLegalLink(element) {
  if (highlightedElements.has(element)) return;
  if (!element || !element.isConnected) return;

  highlightedElements.add(element);

  // Use requestAnimationFrame for smooth DOM updates
  requestAnimationFrame(() => {
    element.classList.add("td-highlighted");
    playGlowPair(element);

    // If the user is still on the page and the link is still visible, repeat
    // the same two-pulse glow once after 30s to re-capture attention.
    window.setTimeout(() => {
      if (document.visibilityState !== "visible") return;
      if (!isElementInViewport(element)) return;
      playGlowPair(element);
    }, LATE_GLOW_REPLAY_DELAY_MS);
  });
}

// IntersectionObserver to trigger animations when links enter viewport
let highlightObserver = null;

function setupHighlightObserver() {
  if (highlightObserver) return;
  
  highlightObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const element = entry.target;
          highlightLegalLink(element);
          // Stop observing once highlighted
          highlightObserver.unobserve(element);
        }
      });
    },
    {
      root: null,
      rootMargin: "50px",
      threshold: 0.1
    }
  );
}

// Scan the page for legal links and set up observation
function scanAndObserveLegalLinks() {
  // Find all potential link/button elements
  const elements = document.querySelectorAll('a, button, [role="link"], [role="button"]');
  
  elements.forEach((el) => {
    // Skip already processed elements
    if (highlightedElements.has(el)) return;
    if (el.classList.contains("td-highlighted")) return;
    
    // Check if it's a legal link
    if (isLikelyLegalLink(el)) {
      // Observe for viewport entry
      highlightObserver.observe(el);
    }
  });
}

// Watch for dynamically added content
let mutationObserverForHighlight = null;

function setupMutationObserverForHighlight() {
  if (mutationObserverForHighlight) return;
  
  mutationObserverForHighlight = new MutationObserver((mutations) => {
    let shouldScan = false;
    
    for (const mutation of mutations) {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if the added node or its children might contain legal links
            if (node.matches && (node.matches('a, button, [role="link"], [role="button"]') || 
                node.querySelector('a, button, [role="link"], [role="button"]'))) {
              shouldScan = true;
              break;
            }
          }
        }
      }
      if (shouldScan) break;
    }
    
    if (shouldScan) {
      // Debounce scanning for performance
      clearTimeout(mutationObserverForHighlight._scanTimeout);
      mutationObserverForHighlight._scanTimeout = setTimeout(scanAndObserveLegalLinks, 100);
    }
  });
  
  mutationObserverForHighlight.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Initialize highlighting when DOM is ready
function initLinkHighlighting() {
  // Skip on non-HTML documents (SVG/XML viewers) — no document.head, no document.body
  if (!UI.host || !document.head || !document.body) return;
  // Don't highlight if auto-hover is disabled (user preference)
  if (!preferences.autoHover) return;
  
  injectHighlightStyles();
  setupHighlightObserver();
  scanAndObserveLegalLinks();
  setupMutationObserverForHighlight();
}

// Initialize after a short delay to let page settle
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(initLinkHighlighting, 500);
  });
} else {
  setTimeout(initLinkHighlighting, 500);
}

// Listen for storage changes to refresh footer when usage updates
try {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    try {
      if (areaName !== "local" || !isExtensionContextValid()) return;

      if (changes.monthlyUsage) {
        refreshFooterIfVisible();
      }

      if (changes.preferences) {
        const next = changes.preferences.newValue;
        if (next && typeof next === "object") {
          preferences = { ...preferences, ...normalizePrefsPatch(next) };
          HOVER_DELAY_MS = parseInt(String(preferences.hoverDelay), 10) || 750;
          refreshSummaryIfVisible().catch(() => {});
        } else {
          loadPreferences().then(() => refreshSummaryIfVisible()).catch(() => {});
        }
      }
    } catch {
      // Context invalidated - listener will stop working; no need to log
    }
  });
} catch {
  // Extension context invalid at registration time
}

// Re-render visible summary when prefs change (e.g. red flags / quotes toggles in popup)
async function refreshSummaryIfVisible() {
  try {
    if (!isExtensionContextValid()) return;
    if (!UI.popover || UI.popover.style.display !== "block") return;
    if (!current.lastSummary || current.lastSummaryUrl == null) return;
    await renderSummary(current.lastSummary, current.lastSummaryUrl, current.lastSummaryFromCache);
    if (current.anchor) showPopover(current.anchor);
  } catch {
    // Optional refresh — ignore failures
  }
}

// Function to refresh footer if popover is currently visible
async function refreshFooterIfVisible() {
  try {
    if (!UI.popover || !UI.popover.shadowRoot) {
      return;
    }

    const footerStats = UI.popover.shadowRoot.querySelector(".footer-stats");
    if (!footerStats) {
      return;
    }

    const viewSourceLink = UI.popover.shadowRoot.querySelector('a[data-action="view-source"]');
    const currentUrl = viewSourceLink?.getAttribute("href") || current.url || null;
    const isSummary = !!UI.popover.shadowRoot.querySelector(".summary-content-reveal");
    const html = await getStatsFooter(currentUrl, isSummary);
    const wrap = document.createElement("div");
    wrap.innerHTML = html.trim();
    const nextStats = wrap.querySelector(".footer-stats");
    if (nextStats) {
      footerStats.innerHTML = nextStats.innerHTML;
    }
  } catch (e) {
    // Silently fail - footer refresh is optional
  }
}

loadPreferences().then(() => {
  // Skip link scanning on non-HTML documents (SVG/XML viewers, etc.)
  if (!UI.host) return;
  if (preferences.autoHover) {
    initLinkHighlighting();
  }
});


