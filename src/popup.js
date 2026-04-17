// Popup-only logic. Kept as an external file because Manifest V3 CSP
// blocks inline <script> blocks in extension pages.
// NOTE: options.js is loaded first and handles sign-in, sign-up, and preferences
// shared between popup.html and options.html. This file only contains the bits
// that are popup-specific (logo + forgot-password link).

(function () {
  const SUPABASE_URL = "https://rsxvxezucgczesplmjiw.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzeHZ4ZXp1Y2djemVzcGxtaml3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NjcwNjYsImV4cCI6MjA4MzU0MzA2Nn0.1umoIH60gsytGtmfbgfxr1OZJs_L-62wT_BWVaMt5lw";

  const logo = document.getElementById("logoImg");
  if (logo && typeof chrome?.runtime?.getURL === "function") {
    logo.src = chrome.runtime.getURL("icons/icon48.png");
  }

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
