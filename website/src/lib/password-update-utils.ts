/**
 * Pure helpers for the website password-reset PUT /auth/v1/user response.
 * Distinct from auth-flow-utils (#33) which owns recovery-hash parsing and
 * pre-submit password length/match validation — this locks the HTTP outcome
 * after those checks pass.
 */

export type PasswordUpdateHttpResult =
  | { status: "success" }
  | { status: "form_error"; message: string };

/**
 * Map a completed password-update HTTP response into UI stage + message.
 * Prefer `message`, then `error_description`, then a stable fallback
 * (same `??` chain as the historical reset-password page).
 */
export function resolvePasswordUpdateHttpResult(
  res: { ok: boolean },
  data: { message?: unknown; error_description?: unknown } | null | undefined,
): PasswordUpdateHttpResult {
  if (res?.ok) {
    return { status: "success" };
  }

  const message =
    (data?.message as string | undefined) ??
    (data?.error_description as string | undefined) ??
    "Password update failed.";

  return { status: "form_error", message: String(message) };
}

/** Network / unexpected failure while calling the password-update endpoint. */
export function resolvePasswordUpdateNetworkError(): PasswordUpdateHttpResult {
  return {
    status: "form_error",
    message: "Something went wrong. Please try again.",
  };
}
