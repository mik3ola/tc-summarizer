/**
 * Pure options-page auth helpers for password-grant session shaping and
 * signup outcome messaging. Distinct from background refresh session builders
 * (email fallback when data.user is missing; signup confirmation_sent_at).
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for options.html script load.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestOptionsAuthUtils = api;
  root.buildSessionFromPasswordGrantResponse = api.buildSessionFromPasswordGrantResponse;
  root.resolveSignupUiOutcome = api.resolveSignupUiOutcome;
  root.extractAuthApiErrorMessage = api.extractAuthApiErrorMessage;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /**
   * Map a successful password-grant token response into stored session shape.
   * When Supabase omits `user`, fall back to `{ email }` from the form input
   * (unlike refresh builders that preserve previousSession.user).
   */
  function buildSessionFromPasswordGrantResponse(data, email, nowMs = Date.now()) {
    return {
      access_token: data?.access_token,
      refresh_token: data?.refresh_token,
      expires_at: nowMs + Number(data?.expires_in || 0) * 1000,
      user: data?.user
        ? { id: data.user.id, email: data.user.email }
        : { email },
    };
  }

  /**
   * Decide signup success / confirm-email messaging after a 2xx signup body.
   * @returns {{
   *   kind: "needs_email_confirm"|"ready_to_sign_in"|"ambiguous_success"|"error",
   *   title?: string,
   *   message: string,
   * }}
   */
  function resolveSignupUiOutcome(data) {
    if (data?.user?.id || data?.id) {
      if (data?.user?.confirmation_sent_at || data?.confirmation_sent_at) {
        return {
          kind: "needs_email_confirm",
          title: "Account created!",
          message:
            "Please check your email to verify your account, then come back and sign in.",
        };
      }
      return {
        kind: "ready_to_sign_in",
        title: "Account created!",
        message: "You can now sign in with your email and password.",
      };
    }

    if (data?.error) {
      return {
        kind: "error",
        message: String(data.error.message || data.error),
      };
    }

    // Some Supabase configs auto-confirm / return sparse bodies
    return {
      kind: "ambiguous_success",
      title: "Account created!",
      message: "Please check your email or try signing in.",
    };
  }

  /**
   * Normalize Supabase auth error payloads across signup/signin response shapes.
   * Signup historically prefers `msg`; signin prefers `error_description`.
   */
  function extractAuthApiErrorMessage(
    data,
    fallback,
    { checkMsg = false } = {}
  ) {
    return (
      (checkMsg ? data?.msg : undefined) ||
      data?.error_description ||
      data?.message ||
      data?.error?.message ||
      fallback
    );
  }

  return {
    buildSessionFromPasswordGrantResponse,
    resolveSignupUiOutcome,
    extractAuthApiErrorMessage,
  };
});
