// Popup-only logic. Kept as an external file because Manifest V3 CSP
// blocks inline <script> blocks in extension pages.
// NOTE: options.js is loaded first and handles sign-in, sign-up, and preferences
// shared between popup.html and options.html. This file only contains the bits
// that are popup-specific (logo + forgot-password link).

(function () {
  const SUPABASE_URL = "https://rsxvxezucgczesplmjiw.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzeHZ4ZXp1Y2djemVzcGxtaml3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NjcwNjYsImV4cCI6MjA4MzU0MzA2Nn0.1umoIH60gsytGtmfbgfxr1OZJs_L-62wT_BWVaMt5lw";

  function isSafariExtension() {
    try {
      const url = chrome?.runtime?.getURL?.("");
      return typeof url === "string" && url.startsWith("safari-web-extension://");
    } catch {
      return false;
    }
  }

  function prefersTouchSummarize() {
    try {
      if (window.matchMedia?.("(pointer: coarse)")?.matches) return true;
      const ua = navigator.userAgent || "";
      if (/iPhone|iPad|iPod/i.test(ua)) return true;
      if (/Macintosh/i.test(ua) && (navigator.maxTouchPoints || 0) > 1) return true;
      return false;
    } catch {
      return false;
    }
  }

  const logo = document.getElementById("logoImg");
  if (logo && typeof chrome?.runtime?.getURL === "function") {
    logo.src = chrome.runtime.getURL("icons/icon48.png");
  }

  // Safari: explain per-site permission grant (not shown in Chrome)
  const safariTip = document.getElementById("safariPermissionTip");
  if (safariTip && isSafariExtension()) {
    safariTip.classList.remove("hidden");
  }

  // Touch / iOS: clarify auto-summarize uses tap, not hover
  if (prefersTouchSummarize()) {
    const label = document.getElementById("autoHoverLabel");
    const hint = document.getElementById("autoHoverHint");
    if (label) label.textContent = "Auto-summarize on tap";
    if (hint) hint.textContent = "Show summary when tapping legal links";
  }

  // Open full settings via extension API (works better than target=_blank on Safari)
  async function openFullSettings(e) {
    e?.preventDefault?.();
    try {
      if (chrome?.runtime?.openOptionsPage) {
        chrome.runtime.openOptionsPage();
        return;
      }
      await chrome.runtime.sendMessage({ type: "open_options" });
    } catch {
      window.open(chrome.runtime.getURL("src/options.html"), "_blank", "noopener,noreferrer");
    }
  }
  document.getElementById("openOptionsBtn")?.addEventListener("click", openFullSettings);
  document.getElementById("openOptionsLink")?.addEventListener("click", openFullSettings);

  document.getElementById("forgotPasswordLink")?.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = document.getElementById("authEmail")?.value?.trim();
    if (!email) {
      alert('Please enter your email address first, then click "Forgot password?".');
      return;
    }
    try {
      const res = await fetch(
        `${SUPABASE_URL}/auth/v1/recover?redirect_to=https://termsdigest.com/auth/reset-password`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ email }),
        }
      );
      if (res.ok || res.status === 200) {
        alert("Password reset email sent! Check your inbox.");
      } else {
        alert("Could not send reset email. Please try again.");
      }
    } catch {
      alert("Something went wrong. Please try again.");
    }
  });
})();
