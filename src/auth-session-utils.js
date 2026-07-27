/**
 * Pure auth / session helpers for summarize retry branching.
 * Dual export: CommonJS for Node/Vitest; globalThis + importScripts for MV3 worker.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestAuthSessionUtils = api;
  root.isUnauthorizedBackendError = api.isUnauthorizedBackendError;
  root.shouldProactivelyRefreshSession = api.shouldProactivelyRefreshSession;
  root.resolveProactiveSessionRefresh = api.resolveProactiveSessionRefresh;
  root.resolveBackendFailureAction = api.resolveBackendFailureAction;
  root.resolveAuthRefreshFailure = api.resolveAuthRefreshFailure;
  root.buildSessionFromRefreshResponse = api.buildSessionFromRefreshResponse;
  root.parseBackendErrorResponse = api.parseBackendErrorResponse;
  root.CLEARED_SESSION_STORAGE = api.CLEARED_SESSION_STORAGE;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /** Storage patch used when an expired/unrefreshable session must be cleared. */
  const CLEARED_SESSION_STORAGE = {
    supabaseSession: null,
    subscription: null,
    subscriptionPlan: null,
    userEmail: null,
    monthlyUsage: null,
  };

  /** Detect 401 / JWT auth failures from backend error messages. */
  function isUnauthorizedBackendError(error) {
    const msg = error?.message || String(error || "");
    return (
      msg.includes("401") ||
      msg.includes("Invalid JWT") ||
      msg.includes("Unauthorized") ||
      msg.includes("Auth failed")
    );
  }

  /**
   * Local quota detection for failure routing.
   * (Sibling PR may export a similar helper — keep this private to avoid dual exports.)
   */
  function isQuotaExceededError(error) {
    if (!error) return false;
    if (error.quotaExceeded === true || error.status === 429) return true;
    const msg = String(error.message || error);
    return msg.includes("Quota exceeded") || msg.includes("quota exceeded");
  }

  /** Whether summarize should attempt a refresh before calling the backend. */
  function shouldProactivelyRefreshSession({
    hasAccessToken = false,
    isSessionExpired = false,
    hasAnonKey = false,
  } = {}) {
    return !!(hasAccessToken && isSessionExpired && hasAnonKey);
  }

  /**
   * After a proactive refresh attempt: keep refreshed session or clear expired auth.
   */
  function resolveProactiveSessionRefresh({ refreshSucceeded = false } = {}) {
    return refreshSucceeded
      ? { action: "use_refreshed_session" }
      : { action: "clear_expired_session" };
  }

  /**
   * Decide how to handle a failed backend summarize call.
   * Priority matches background.js: quota own-key → auth refresh → generic own-key → rethrow.
   */
  function resolveBackendFailureAction({ error, canFallbackToOwnKey = false } = {}) {
    if (isQuotaExceededError(error) && canFallbackToOwnKey) {
      return { action: "own_key_fallback", reason: "quota" };
    }
    if (isUnauthorizedBackendError(error)) {
      return { action: "auth_refresh" };
    }
    if (canFallbackToOwnKey) {
      return { action: "own_key_fallback", reason: "backend_error" };
    }
    return { action: "rethrow" };
  }

  /**
   * When auth refresh fails after a 401: Pro own-key fallback or force re-login.
   */
  function resolveAuthRefreshFailure({ canFallbackToOwnKey = false } = {}) {
    if (canFallbackToOwnKey) {
      return { action: "own_key_fallback" };
    }
    return { action: "clear_session_and_reauth" };
  }

  /**
   * Map a successful Supabase refresh_token response into a stored session object.
   * Returns null when access_token is missing. Preserves background.js field mapping
   * (refresh_token taken from response as-is; user falls back to previous session).
   */
  function buildSessionFromRefreshResponse(data, previousSession = null, nowMs = Date.now()) {
    if (!data?.access_token) return null;
    const expiresAt = nowMs + Number(data.expires_in || 0) * 1000;
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: expiresAt,
      user: data.user
        ? { id: data.user.id, email: data.user.email }
        : previousSession?.user,
    };
  }

  /**
   * Parse a non-OK summarize backend body into structured error fields
   * (preserves quotaExceeded for Pro own-key fallback).
   */
  function parseBackendErrorResponse(status, bodyText) {
    let errorData = null;
    try {
      errorData = JSON.parse(String(bodyText ?? ""));
    } catch {
      // non-JSON bodies are fine
    }
    return {
      status,
      data: errorData,
      quotaExceeded: errorData?.quotaExceeded === true,
      message: `Backend error (${status}): ${String(bodyText ?? "").slice(0, 200)}`,
    };
  }

  return {
    CLEARED_SESSION_STORAGE,
    isUnauthorizedBackendError,
    shouldProactivelyRefreshSession,
    resolveProactiveSessionRefresh,
    resolveBackendFailureAction,
    resolveAuthRefreshFailure,
    buildSessionFromRefreshResponse,
    parseBackendErrorResponse,
  };
});
