/**
 * Pure credentials gate for options/popup password sign-in and sign-up.
 * Locks the shared "both email and password required" check before any
 * Supabase auth request is made (high blast-radius auth UX).
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for options/popup pages.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestOptionsCredentialsUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const MISSING_CREDENTIALS_ERROR = "Please enter both email and password.";

  /**
   * Trim and validate email + password before password-grant / signup fetch.
   * Matches historical options.js: both fields must be non-empty after trim.
   *
   * @returns {{
   *   ok: true,
   *   email: string,
   *   password: string
   * } | {
   *   ok: false,
   *   error: string
   * }}
   */
  function resolvePasswordAuthCredentials(email, password) {
    const trimmedEmail = typeof email === "string" ? email.trim() : "";
    const trimmedPassword = typeof password === "string" ? password.trim() : "";
    if (!trimmedEmail || !trimmedPassword) {
      return { ok: false, error: MISSING_CREDENTIALS_ERROR };
    }
    return { ok: true, email: trimmedEmail, password: trimmedPassword };
  }

  return {
    MISSING_CREDENTIALS_ERROR,
    resolvePasswordAuthCredentials,
  };
});
