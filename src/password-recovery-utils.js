/**
 * Pure helpers for forgot-password / recovery request gating.
 * Locks email-required gate and HTTP outcome classification shared by
 * popup.js (alert copy) and options.js (modal copy). Redirect URL must stay
 * on the production reset page — not localhost.
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for options/popup pages.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestPasswordRecoveryUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const RECOVERY_REDIRECT_TO = "https://termsdigest.com/auth/reset-password";

  /**
   * Gate before calling Supabase /auth/v1/recover.
   * @returns {{ ok: true, email: string } | { ok: false, reason: "missing_email" }}
   */
  function resolveForgotPasswordGate(email) {
    const trimmed = typeof email === "string" ? email.trim() : "";
    if (!trimmed) {
      return { ok: false, reason: "missing_email" };
    }
    return { ok: true, email: trimmed };
  }

  /**
   * Classify recover HTTP response. Popup historically treats status 200 as ok
   * even if `ok` were false; keep that inclusive check.
   * @returns {"success"|"failure"}
   */
  function resolveForgotPasswordHttpOutcome({ ok = false, status = 0 } = {}) {
    if (ok || status === 200) return "success";
    return "failure";
  }

  /** Build recover URL with fixed production redirect_to. */
  function buildRecoverUrl(supabaseUrl) {
    const base = String(supabaseUrl || "").replace(/\/$/, "");
    return `${base}/auth/v1/recover?redirect_to=${encodeURIComponent(RECOVERY_REDIRECT_TO)}`;
  }

  return {
    RECOVERY_REDIRECT_TO,
    resolveForgotPasswordGate,
    resolveForgotPasswordHttpOutcome,
    buildRecoverUrl,
  };
});
