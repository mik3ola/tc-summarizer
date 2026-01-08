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
    console.warn("[T&C Summarizer] Could not load preferences:", e);
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
  "returns",
  "return policy",
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
  
  const combined = `${txt} ${aria} ${title} ${hrefLower} ${id}`;
  if (!combined.trim()) return false;
  
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
  console.log(`[T&C Summarizer] Looking for ${contentType} content for:`, element.textContent?.trim());
  
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
          console.log(`[T&C Summarizer] Found ${contentType} content via selector:`, selector);
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
            console.log(`[T&C Summarizer] Found content via ID pattern:`, selector);
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
    console.log(`[T&C Summarizer] Found ${contentType} content via scoring:`, bestMatch.className || bestMatch.id);
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
      console.warn("[T&C Summarizer] No HTML provided");
      return "";
    }
    
    const doc = new DOMParser().parseFromString(html, "text/html");
    if (baseUrl) {
      const base = doc.createElement("base");
      base.href = baseUrl;
      doc.head.appendChild(base);
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

    console.log(`[T&C Summarizer] Extracted ${bestText.length} chars from HTML (${html.length} chars)`);
    return bestText;
  } catch (e) {
    console.error("[T&C Summarizer] extractTextFromHtml error:", e);
    return "";
  }
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function createUi() {
  const host = document.createElement("div");
  host.id = "tc-hover-summarizer-root";
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
      background: #0b1220;
      color: #e5e7eb;
      border: 1px solid rgba(148,163,184,0.25);
      border-radius: 12px;
      box-shadow: 0 18px 60px rgba(0,0,0,0.35);
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
      font-size: 12.5px;
      line-height: 1.4;
      padding: 12px 12px 10px;
    }
    .popover::-webkit-scrollbar { width: 6px; }
    .popover::-webkit-scrollbar-track { background: transparent; }
    .popover::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.35); border-radius: 3px; }
    .popover::-webkit-scrollbar-thumb:hover { background: rgba(148,163,184,0.5); }
    .header { display: flex; align-items: center; justify-content: space-between; gap: 10px; position: sticky; top: -12px; background: #0b1220; padding: 12px 0 8px; margin: -12px 0 0; z-index: 1; }
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
    .header-right { display: flex; align-items: center; gap: 6px; }
    .confidence-label { font-size: 10px; color: rgba(226,232,240,0.6); }
    .badge {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 999px;
      border: 1px solid rgba(148,163,184,0.25);
      background: rgba(15,23,42,0.8);
      color: rgba(226,232,240,0.85);
    }
    .muted { color: rgba(226,232,240,0.72); }
    .section { margin-top: 10px; }
    .h { font-weight: 700; color: rgba(226,232,240,0.95); margin-bottom: 4px; }
    ul { margin: 0; padding-left: 18px; }
    li { margin: 2px 0; }
    .divider { height: 1px; background: rgba(148,163,184,0.18); margin: 10px 0 8px; }
    .buttons { display:flex; gap: 8px; margin-top: 10px; }
    button {
      all: unset;
      cursor: pointer;
      border: 1px solid rgba(148,163,184,0.25);
      border-radius: 10px;
      padding: 6px 10px;
      font-size: 12px;
      color: rgba(226,232,240,0.92);
      background: rgba(15,23,42,0.8);
    }
    button:hover { background: rgba(30,41,59,0.85); }
    a.link { color: rgba(96,165,250,0.95); text-decoration: none; }
    a.link:hover { text-decoration: underline; }
    .error {
      border: 1px solid rgba(248,113,113,0.35);
      background: rgba(127,29,29,0.25);
      padding: 8px 10px;
      border-radius: 10px;
      color: rgba(254,226,226,0.95);
      margin-top: 10px;
    }
    .spinner {
      width: 14px;
      height: 14px;
      border-radius: 999px;
      border: 2px solid rgba(148,163,184,0.3);
      border-top-color: rgba(96,165,250,0.95);
      animation: spin 0.8s linear infinite;
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

  // default right/below the link
  const desiredLeft = rect.left + Math.min(rect.width, 40) + 12;
  const desiredTop = rect.top + rect.height + 10;

  UI.popover.style.display = "block";
  UI.popover.style.left = "0px";
  UI.popover.style.top = "0px";

  // measure
  const popRect = UI.popover.getBoundingClientRect();
  let left = clamp(desiredLeft, padding, vpW - popRect.width - padding);
  let top = clamp(desiredTop, padding, vpH - popRect.height - padding);

  // if would cover the link area too much, try above
  if (top > rect.top - popRect.height - 10 && rect.bottom + popRect.height > vpH - padding) {
    top = clamp(rect.top - popRect.height - 10, padding, vpH - popRect.height - padding);
  }

  UI.popover.style.left = `${left}px`;
  UI.popover.style.top = `${top}px`;
}

function renderLoading(url) {
  UI.popover.innerHTML = `
    <div class="header">
      <div class="title">Summarizing…</div>
      <div class="header-right">
        <div class="spinner" aria-label="Loading"></div>
      </div>
    </div>
    <div class="section muted" style="margin-top:8px;">
      Fetching <span title="${escapeHtml(url)}">${escapeHtml(truncateUrl(url))}</span>
    </div>
    <div class="divider"></div>
    <div class="muted">Keep your mouse over the popover to view the summary.</div>
  `;
}

function truncateUrl(url, maxLen = 50) {
  if (url.length <= maxLen) return url;
  return url.slice(0, maxLen - 3) + "…";
}

function renderError(errMsg, url) {
  UI.popover.innerHTML = `
    <div class="header">
      <div class="title">Couldn't summarize</div>
      <div class="header-right">
        <div class="badge">error</div>
      </div>
    </div>
    <div class="error">${escapeHtml(errMsg || "Unknown error")}</div>
    <div class="buttons">
      <button data-action="open-options">Open Options</button>
      <button data-action="open-link">Open link directly</button>
    </div>
    <div class="section muted" style="margin-top:8px;">
      Click "Open link directly" to view the original page.
    </div>
  `;
}

function renderClickToLoad(element) {
  const linkText = (element.textContent || "").trim();
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

function renderSummary(summary, url, fromCache) {
  const title = typeof summary?.title === "string" && summary.title.trim() ? summary.title.trim() : "Summary";
  const confidence = summary?.confidence || "medium";
  const badgeText = fromCache ? `${confidence} • cached` : confidence;
  const badgeTooltip = getConfidenceTooltip(confidence);

  UI.popover.innerHTML = `
    <div class="header">
      <div class="title" title="${escapeAttr(title)}">${escapeHtml(title)}</div>
      <div class="header-right">
        <span class="confidence-label">Confidence:</span>
        <div class="badge" title="${escapeAttr(badgeTooltip)}">${escapeHtml(badgeText)}</div>
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
    <div class="muted">
      Note: This is an automated summary. <a class="link" data-action="view-source" href="${escapeAttr(url)}" target="_blank" rel="noreferrer">View full content</a>.
    </div>
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
      chrome.runtime.openOptionsPage().catch((err) => {
        console.error("[T&C Summarizer] Failed to open options:", err);
        // Fallback: open in new tab
        window.open(chrome.runtime.getURL("src/options.html"), "_blank");
      });
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
    }
  }
});


