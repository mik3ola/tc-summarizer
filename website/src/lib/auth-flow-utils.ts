/**
 * Pure auth-flow helpers for website confirm + password-reset pages.
 * Keeps token parsing and password validation deterministic and unit-testable.
 */

export type ConfirmBootstrapResult =
  | { action: "verify"; tokenHash: string; type: string }
  | { action: "success" }
  | { action: "error"; errorMessage: string };

export type ConfirmVerifyResult =
  | { status: "success" }
  | { status: "already_confirmed" }
  | { status: "error"; errorMessage: string };

export type RecoveryHashResult =
  | { valid: true; accessToken: string }
  | { valid: false };

export type PasswordValidationResult =
  | { ok: true }
  | { ok: false; errorMsg: string };

const NO_CONFIRM_TOKEN_MESSAGE =
  "No confirmation token found. Please use the link from your email.";

/**
 * Decide how the email-confirm page should bootstrap from URL search + hash.
 * Preserves existing behavior: hash access_token ⇒ success; otherwise error.
 */
export function resolveConfirmBootstrap({
  search = "",
  hash = "",
}: {
  search?: string;
  hash?: string;
} = {}): ConfirmBootstrapResult {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search
  );
  const tokenHash = params.get("token_hash");
  const type = params.get("type") ?? "signup";

  if (tokenHash) {
    return { action: "verify", tokenHash, type };
  }

  if (hash.includes("access_token")) {
    return { action: "success" };
  }

  return { action: "error", errorMessage: NO_CONFIRM_TOKEN_MESSAGE };
}

/**
 * Map a Supabase /auth/v1/verify JSON body to confirm-page UI status.
 * The specific "invalid or expired" string is treated as already_confirmed
 * (common when the user opens the link twice).
 */
export function resolveConfirmVerifyResult(data: {
  error?: string;
  error_description?: string;
} | null | undefined): ConfirmVerifyResult {
  if (data?.error) {
    if (data.error === "Email link is invalid or has expired") {
      return { status: "already_confirmed" };
    }
    return {
      status: "error",
      errorMessage:
        data.error_description ?? data.error ?? "Verification failed.",
    };
  }
  return { status: "success" };
}

/**
 * Parse Supabase recovery redirect hash (`#access_token=…&type=recovery`).
 */
export function parseRecoveryHash(hash: string | null | undefined): RecoveryHashResult {
  const raw = String(hash || "");
  const params = new URLSearchParams(raw.replace("#", "?"));
  const token = params.get("access_token");
  const type = params.get("type");

  if (token && type === "recovery") {
    return { valid: true, accessToken: token };
  }
  return { valid: false };
}

/**
 * Client-side new-password checks before calling Supabase user update.
 */
export function validateNewPassword({
  password = "",
  confirm = "",
}: {
  password?: string;
  confirm?: string;
} = {}): PasswordValidationResult {
  if (password.length < 8) {
    return { ok: false, errorMsg: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { ok: false, errorMsg: "Passwords do not match." };
  }
  return { ok: true };
}
