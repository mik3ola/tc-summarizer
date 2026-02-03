let HOVER_DELAY_MS = 750;
const POPOVER_MAX_WIDTH_PX = 420;

// Preferences (loaded from storage)
let preferences = {
  autoHover: true,
  showRedFlags: true,
  showQuotes: true,
  hoverDelay: 750
};

// Load preferences from storage
async function loadPreferences() {
  try {
    const response = await chrome.runtime.sendMessage({ type: "get_preferences" });
    if (response?.ok && response.preferences) {
      preferences = { ...preferences, ...response.preferences };
      HOVER_DELAY_MS = parseInt(preferences.hoverDelay) || 750;
    }
  } catch (e) {
    console.warn("[TermsDigest] Could not load preferences:", e);
  }
}

// Load preferences on startup
loadPreferences();

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
  "billing",
  "subscription",
  "eula",
  "end user license",
  "licence agreement",
  "license agreement",
  "legal",
  "legal notice",
  "cookie policy",
  "data protection"
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
  const elClass = (el.className || "").toLowerCase();
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
  const hrefLower = normalizeText(href);
  const id = normalizeText(el.getAttribute("id") || "");
  
  let combined = `${txt} ${aria} ${title} ${hrefLower} ${id}`;
  if (!combined.trim()) return false;
  
  // Skip if the text is too long (likely a code block or paragraph, not a link label)
  if (txt.length > 100) return false;
  
  // Filter out "termsdigest" to avoid false positives on our own branding
  combined = combined.replace(/termsdigest/gi, "");
  
  return KEYWORDS.some((k) => combined.includes(k));
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
    // Try to set base URL, but ignore CSP errors (some sites like gov.uk block this)
    if (baseUrl) {
      try {
        const base = doc.createElement("base");
        base.href = baseUrl;
        doc.head.appendChild(base);
      } catch (e) {
        // CSP may block base-uri, but that's okay - we just won't have relative URL resolution
        console.warn("[TermsDigest] Could not set base URL (CSP restriction):", e.message);
      }
    }

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

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function createUi() {
  const host = document.createElement("div");
  host.id = "termsdigest-root";
  host.style.all = "initial";
  host.style.position = "fixed";
  host.style.zIndex = "2147483647";
  host.style.left = "0px";
  host.style.top = "0px";
  host.style.width = "0px";
  host.style.height = "0px";

  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = `
    .popover {
      position: fixed;
      max-width: ${POPOVER_MAX_WIDTH_PX}px;
      min-width: 300px;
      max-height: 70vh;
      overflow-y: auto;
      background: rgba(11, 18, 32, 0.75);
      backdrop-filter: blur(10px);
      color: #e5e7eb;
      border: 1px solid rgba(148,163,184,0.25);
      border-radius: 12px;
      box-shadow: 0 18px 60px rgba(0,0,0,0.35);
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
      font-size: 12.5px;
      line-height: 1.4;
      padding: 0;
    }
    .popover::-webkit-scrollbar { width: 6px; }
    .popover::-webkit-scrollbar-track { background: transparent; }
    .popover::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.35); border-radius: 3px; }
    .popover::-webkit-scrollbar-thumb:hover { background: rgba(148,163,184,0.5); }
    .header { display: flex; align-items: center; justify-content: space-between; gap: 10px; position: sticky; top: 0; background: rgba(11, 18, 32, 0.75); backdrop-filter: blur(10px); padding: 12px 12px 8px; margin: 0; z-index: 1; border-radius: 12px 12px 0 0; }
    .row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .title {
      font-size: 12px;
      color: rgba(226,232,240,0.9);
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 280px;
    }
    .header-right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; white-space: nowrap; }
    .confidence-label { font-size: 10px; color: rgba(226,232,240,0.6); }
    .badge {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 999px;
      border: 1px solid rgba(148,163,184,0.25);
      background: rgba(15,23,42,0.8);
      color: rgba(226,232,240,0.85);
      white-space: nowrap;
      flex-shrink: 0;
    }
    .badge-high {
      background: rgba(34,197,94,0.15);
      color: rgba(134,239,172,0.95);
      border-color: rgba(34,197,94,0.35);
    }
    .badge-medium {
      background: rgba(234,179,8,0.15);
      color: rgba(253,224,71,0.95);
      border-color: rgba(234,179,8,0.35);
    }
    .badge-low {
      background: rgba(239,68,68,0.15);
      color: rgba(252,165,165,0.95);
      border-color: rgba(239,68,68,0.35);
    }
    .muted { color: rgba(226,232,240,0.72); }
    .section { margin-top: 10px; padding: 0 12px; }
    .popover > .section:first-of-type { margin-top: 0; }
    .h { font-weight: 700; color: rgba(226,232,240,0.95); margin-bottom: 4px; }
    ul { margin: 0; padding-left: 18px; }
    li { margin: 2px 0; }
    .divider { height: 1px; background: rgba(148,163,184,0.18); margin: 10px 12px 8px; }
    .buttons { display:flex; gap: 8px; margin-top: 12px; padding: 0 12px 12px; }
    .buttons button { flex: 1; }
    .footer-stats {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 12px 12px;
      margin-top: 0;
      gap: 12px;
    }
    .footer-stat {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
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
    .footer-settings {
      margin-left: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      color: rgba(148,163,184,0.7);
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.15s;
      flex-shrink: 0;
    }
    .footer-settings:hover {
      color: rgba(148,163,184,0.95);
      background: rgba(148,163,184,0.1);
    }
    .footer-settings svg {
      width: 16px;
      height: 16px;
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
    .spinner-icon {
      width: 16px;
      height: 16px;
      border-radius: 6px;
      animation: spin 0.8s linear infinite;
      opacity: 0.95;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
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
  isModalContent: false  // Track if current content is from an in-page modal
};

function setPopoverPositionNearAnchor(anchor) {
  const rect = anchor.getBoundingClientRect();
  const padding = 10;
  const vpW = window.innerWidth;
  const vpH = window.innerHeight;
  const scrollX = window.scrollX || window.pageXOffset;
  const scrollY = window.scrollY || window.pageYOffset;

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

async function renderLoading(url) {
  // Get icon URL fresh each time to ensure it's available
  const iconUrl = chrome.runtime.getURL("icons/icon16.png");
  const footer = await getStatsFooter();
  UI.popover.innerHTML = `
    <div class="header">
      <div class="title">Summarizing…</div>
      <div class="header-right">
        <img class="spinner-icon" src="${iconUrl}" alt="" aria-label="Loading" />
      </div>
    </div>
    <div class="section muted" style="margin-top:8px;">
      Fetching <span title="${escapeHtml(url)}">${escapeHtml(truncateUrl(url))}</span>
    </div>
    <div class="divider"></div>
    <div class="section muted" style="padding-bottom: 12px; margin-top: 0;">Keep your mouse over the popover to view the summary.</div>
    ${footer}
  `;
}

function truncateUrl(url, maxLen = 50) {
  if (url.length <= maxLen) return url;
  return url.slice(0, maxLen - 3) + "…";
}

// Get usage stats and render footer
async function getStatsFooter(currentSummaryUrl = null) {
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
    let quota = 5; // Free tier default
    if (plan === "pro") quota = 50;
    else if (plan === "enterprise") quota = 5000;
    
    // Calculate minutes saved for current summary only
    let minutesSaved = 0;
    if (currentSummaryUrl && cache) {
      // Normalize URL to match cache key format (same as background.js)
      const normalizedUrl = currentSummaryUrl.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();
      // Try multiple cache key formats
      const possibleKeys = [
        `summary:${normalizedUrl}`,
        `summary:${currentSummaryUrl}`,
        `summary:${currentSummaryUrl.toLowerCase()}`
      ];
      
      // Also check for partial matches (for modal content with hash fragments)
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
        const words = Math.floor(cache[matchingKey].originalTextLength / 5); // ~5 chars per word
        minutesSaved = Math.floor(words / 200); // 200 words per minute reading speed
      }
    }
    
    const used = monthlyUsage;
    
    return `
      <div class="footer-stats">
        <div class="footer-stat">
          <span class="footer-stat-value">${used}/${quota}</span>
          <span class="footer-stat-label">Used</span>
        </div>
        <div class="footer-stat">
          <span class="footer-stat-value">~${minutesSaved}</span>
          <span class="footer-stat-label">Mins saved</span>
        </div>
        <a class="footer-settings" data-action="open-options" title="Open extension options">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 8C6 9.10457 6.89543 10 8 10Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M13.6569 8.65685C13.6569 8.65685 12.2426 10.0711 10.8284 11.4853C10.4142 11.8995 10.4142 12.5355 10.8284 12.9497C11.2426 13.364 11.8787 13.364 12.2929 12.9497C13.7071 11.5355 15.1213 10.1213 15.1213 10.1213C15.5355 9.70711 15.5355 9.07107 15.1213 8.65685C15.1213 8.65685 13.7071 7.24264 12.2929 5.82843C11.8787 5.41421 11.2426 5.41421 10.8284 5.82843C10.4142 6.24264 10.4142 6.87868 10.8284 7.29289C12.2426 8.70711 13.6569 10.1213 13.6569 10.1213L13.6569 8.65685Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2.34315 7.34315C2.34315 7.34315 3.75736 5.92893 5.17157 4.51472C5.58579 4.1005 5.58579 3.46447 5.17157 3.05025C4.75736 2.63604 4.12132 2.63604 3.70711 3.05025C2.29289 4.46447 0.87868 5.87868 0.87868 5.87868C0.464466 6.29289 0.464466 6.92893 0.87868 7.34315C0.87868 7.34315 2.29289 8.75736 3.70711 10.1716C4.12132 10.5858 4.75736 10.5858 5.17157 10.1716C5.58579 9.75736 5.58579 9.12132 5.17157 8.70711C3.75736 7.29289 2.34315 5.87868 2.34315 5.87868L2.34315 7.34315Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>
      </div>
    `;
  } catch (e) {
    console.warn("[TermsDigest] Could not load stats:", e);
    return `
      <div class="footer-stats">
        <a class="footer-settings" data-action="open-options" title="Open extension options">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 8C6 9.10457 6.89543 10 8 10Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M13.6569 8.65685C13.6569 8.65685 12.2426 10.0711 10.8284 11.4853C10.4142 11.8995 10.4142 12.5355 10.8284 12.9497C11.2426 13.364 11.8787 13.364 12.2929 12.9497C13.7071 11.5355 15.1213 10.1213 15.1213 10.1213C15.5355 9.70711 15.5355 9.07107 15.1213 8.65685C15.1213 8.65685 13.7071 7.24264 12.2929 5.82843C11.8787 5.41421 11.2426 5.41421 10.8284 5.82843C10.4142 6.24264 10.4142 6.87868 10.8284 7.29289C12.2426 8.70711 13.6569 10.1213 13.6569 10.1213L13.6569 8.65685Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2.34315 7.34315C2.34315 7.34315 3.75736 5.92893 5.17157 4.51472C5.58579 4.1005 5.58579 3.46447 5.17157 3.05025C4.75736 2.63604 4.12132 2.63604 3.70711 3.05025C2.29289 4.46447 0.87868 5.87868 0.87868 5.87868C0.464466 6.29289 0.464466 6.92893 0.87868 7.34315C0.87868 7.34315 2.29289 8.75736 3.70711 10.1716C4.12132 10.5858 4.75736 10.5858 5.17157 10.1716C5.58579 9.75736 5.58579 9.12132 5.17157 8.70711C3.75736 7.29289 2.34315 5.87868 2.34315 5.87868L2.34315 7.34315Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>
      </div>
    `;
  }
}

async function renderError(errMsg, url) {
  const msg = errMsg || "Unknown error";
  
  // Check subscription status for Pro users
  let isProUser = false;
  let hasOpenAIKey = false;
  try {
    const data = await chrome.storage.local.get(["subscription", "subscriptionPlan", "openaiApiKey"]);
    isProUser = (data.subscription === "active" && data.subscriptionPlan === "pro") || data.subscriptionPlan === "pro";
    hasOpenAIKey = !!data.openaiApiKey && data.openaiApiKey.trim().length > 0;
  } catch (e) {
    console.warn("[TermsDigest] Could not check subscription status:", e);
  }
  
  // Determine error type and icon
  let displayMsg = msg;
  let errorIcon = "⚠️";
  let headerTitle = "Summary unavailable";
  let showUpgradeButton = false;
  let showRefreshButton = false;
  let isSignInIssue = false;
  let isProQuotaExceeded = false;
  
  if (msg.includes("Extension context invalidated") || msg.includes("message port closed")) {
    displayMsg = "Extension needs page refresh";
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
      <button onclick="location.reload()">Refresh page</button>
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
  } else {
    buttonsHtml = `
      <button data-action="open-options">Open Options</button>
      <button data-action="open-link">View page</button>
    `;
  }
  
  const footer = await getStatsFooter();
  UI.popover.innerHTML = `
    <div class="header">
      <div class="title">${escapeHtml(headerTitle)}</div>
    </div>
    <div class="error-banner">
      <span class="error-icon">${errorIcon}</span>
      <span>${escapeHtml(displayMsg)}</span>
    </div>
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
  const title = typeof summary?.title === "string" && summary.title.trim() ? summary.title.trim() : "Summary";
  const confidence = summary?.confidence || "medium";
  const badgeText = fromCache ? `${confidence} • cached` : confidence;
  const badgeTooltip = getConfidenceTooltip(confidence);
  const badgeColorClass = confidence === "high" ? "badge-high" : confidence === "low" ? "badge-low" : "badge-medium";
  const footer = await getStatsFooter(url);

  UI.popover.innerHTML = `
    <div class="header">
      <div class="title" title="${escapeAttr(title)}">${escapeHtml(title)}</div>
      <div class="header-right">
        <span class="confidence-label">Confidence:</span>
        <div class="badge ${badgeColorClass}" title="${escapeAttr(badgeTooltip)}">${escapeHtml(badgeText)}</div>
      </div>
    </div>
    <div class="section">
      <div class="h">Quick Summary</div>
      <div class="muted">${escapeHtml(summary?.tldr || "")}</div>
    </div>
    ${renderListSection("💰 Costs & renewal", summary?.costs_and_renewal)}
    ${renderListSection("↩️ Cancellation & refunds", summary?.cancellation_and_refunds)}
    ${renderListSection("⚖️ Liability & disputes", summary?.liability_and_disputes)}
    ${renderListSection("🔒 Privacy & data", summary?.privacy_and_data)}
    ${preferences.showRedFlags ? renderListSection("🚩 Red flags", summary?.red_flags) : ""}
    ${preferences.showQuotes ? renderQuotes(summary?.quotes) : ""}
    <div class="divider"></div>
    <div class="section muted" style="padding-bottom: 4px; margin-top: 0;">
      Note: This is an automated summary. <a class="link" data-action="view-source" href="${escapeAttr(url)}" target="_blank" rel="noreferrer">View full content</a>.
    </div>
    ${footer}
  `;
}

function renderListSection(title, items) {
  const arr = Array.isArray(items) ? items.filter((x) => typeof x === "string" && x.trim()) : [];
  if (!arr.length) return "";
  return `
    <div class="section">
      <div class="h">${escapeHtml(title)}</div>
      <ul>${arr.slice(0, 6).map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>
    </div>
  `;
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
  return `
    <div class="section">
      <div class="h">Supporting quotes</div>
      <ul>
        ${cleaned.slice(0, 3).map((q) => `<li><span class="muted">“${escapeHtml(q.quote)}”</span>${q.why ? ` — ${escapeHtml(q.why)}` : ""}</li>`).join("")}
      </ul>
    </div>
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
}

async function summarizeModal(modalSelector, anchor, requestId) {
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
    const htmlLen = result.html?.length || 0;
    throw new Error(`Could not extract readable text. HTML received: ${htmlLen} chars. The page may require JavaScript or be blocked.`);
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

// Global event delegation - hover to trigger, hover out to dismiss
document.addEventListener(
  "mouseover",
  (e) => {
    // Check if auto-hover is enabled
    if (!preferences.autoHover) return;
    
    // Try to find a legal link/button near the hover target
    const target = e.target;
    if (!target || !target.closest) return;
    
    // Check for <a>, <button>, or elements with link/button role
    const el = target.closest('a, button, [role="link"], [role="button"]');
    if (!el) return;
    if (!isLikelyLegalLink(el)) return;
    
    // Don't restart if already showing for this element
    if (current.anchor === el && UI.popover.style.display === "block") return;
    
    startHover(el);
  },
  true
);

// Handle mouse leaving the anchor element
document.addEventListener(
  "mouseout",
  (e) => {
    const target = e.target;
    if (!target || !target.closest) return;
    const el = target.closest('a, button, [role="link"], [role="button"]');
    if (el && el === current.anchor) {
      // Give user time to move mouse to popover
      scheduleHideCheck();
    }
  },
  true
);

function scheduleHideCheck() {
  window.setTimeout(() => {
    const overPopover = UI.popover.matches(":hover");
    const overAnchor = current.anchor && current.anchor.matches && current.anchor.matches(":hover");
    if (!overPopover && !overAnchor) {
      closePopover();
    }
  }, 150);
}

// When mouse leaves the popover, check if we should hide
UI.popover.addEventListener("mouseleave", () => {
  scheduleHideCheck();
});

// Handle button and link clicks inside the popover
UI.popover.addEventListener("click", (e) => {
  // Check for buttons
  const btn = e.target && e.target.closest ? e.target.closest("button") : null;
  if (btn) {
    const action = btn.getAttribute("data-action");
    if (action === "open-options") {
      e.preventDefault();
      e.stopPropagation();
      // Ask background script to open options page (window.open doesn't work for chrome-extension:// URLs)
      chrome.runtime.sendMessage({ type: "open_options" });
      return;
    }
    if (action === "upgrade-to-pro") {
      e.preventDefault();
      e.stopPropagation();
      // Ask background script to open options page (window.open doesn't work for chrome-extension:// URLs)
      chrome.runtime.sendMessage({ type: "open_options_upgrade" });
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
      // Handle footer settings icon click
      chrome.runtime.sendMessage({ type: "open_options" });
      return;
    }
  }
  
  // Also check if clicking directly on footer settings icon
  const footerSettings = e.target && e.target.closest ? e.target.closest(".footer-settings") : null;
  if (footerSettings) {
    e.preventDefault();
    e.stopPropagation();
    chrome.runtime.sendMessage({ type: "open_options" });
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
  `;
  
  document.head.appendChild(style);
}

// Highlight a legal link element
function highlightLegalLink(element) {
  if (highlightedElements.has(element)) return;
  if (!element || !element.isConnected) return;
  
  highlightedElements.add(element);
  
  // Use requestAnimationFrame for smooth DOM updates
  requestAnimationFrame(() => {
    element.classList.add("td-highlighted");
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

// Re-initialize when preferences are loaded (in case autoHover was false initially)
// Listen for storage changes to refresh footer when usage updates
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.monthlyUsage) {
    // Usage count was updated - refresh footer if popover is visible
    refreshFooterIfVisible();
  }
});

// Function to refresh footer if popover is currently visible
async function refreshFooterIfVisible() {
  try {
    if (!UI.popover || !UI.popover.shadowRoot) {
      return; // Popover not visible
    }
    
    const footerElement = UI.popover.shadowRoot.querySelector(".footer-stats");
    if (!footerElement) {
      return; // Footer not present
    }
    
    // Get current URL from the popover's "View source" link or current state
    const viewSourceLink = UI.popover.shadowRoot.querySelector('a[data-action="view-source"]');
    const currentUrl = viewSourceLink?.getAttribute("href") || current.url || null;
    
    // Get fresh footer HTML with updated usage count
    const newFooter = await getStatsFooter(currentUrl);
    
    // Replace the footer element
    if (footerElement && footerElement.parentNode) {
      footerElement.outerHTML = newFooter;
      
      // Re-attach event listeners for the settings button
      const settingsBtn = UI.popover.shadowRoot.querySelector('.footer-settings[data-action="open-options"]');
      if (settingsBtn) {
        settingsBtn.addEventListener("click", (e) => {
          e.preventDefault();
          chrome.runtime.sendMessage({ type: "open_options" });
        });
      }
    }
  } catch (e) {
    // Silently fail - footer refresh is optional
  }
}

loadPreferences().then(() => {
  if (preferences.autoHover) {
    initLinkHighlighting();
  }
});


