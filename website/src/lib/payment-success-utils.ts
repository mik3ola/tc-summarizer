/**
 * Pure helpers for the Stripe checkout success page bootstrap and opener notify.
 * Keeps session_id → loading/success messaging and postMessage shape deterministic.
 */

export type PaymentSuccessStatus = "loading" | "success" | "error";

export type PaymentSuccessBootstrap =
  | {
      initialStatus: "success";
      initialMessage: string;
      deferMs: null;
      deferredSuccessMessage: null;
    }
  | {
      initialStatus: "loading";
      initialMessage: string;
      deferMs: number;
      deferredSuccessMessage: string;
    };

/** Default delay before treating a Stripe session_id return as verified. */
export const PAYMENT_SUCCESS_VERIFY_DELAY_MS = 1500;

/** Delay before auto-closing a success popup that still has an opener. */
export const PAYMENT_SUCCESS_AUTOCLOSE_DELAY_MS = 5000;

/**
 * Decide initial UI state from the checkout redirect query.
 * No session_id ⇒ immediate success (direct navigation / bookmark).
 * With session_id ⇒ brief loading state, then deferred success copy.
 */
export function resolvePaymentSuccessBootstrap(
  sessionId: string | null | undefined
): PaymentSuccessBootstrap {
  if (!sessionId) {
    return {
      initialStatus: "success",
      initialMessage: "Payment successful!",
      deferMs: null,
      deferredSuccessMessage: null,
    };
  }

  return {
    initialStatus: "loading",
    initialMessage: "Verifying your payment...",
    deferMs: PAYMENT_SUCCESS_VERIFY_DELAY_MS,
    deferredSuccessMessage:
      "Payment verified! Your subscription is now active.",
  };
}

/**
 * postMessage payload for checkout popups notifying a parent window.
 * Historical shape: `{ type: "payment_success", sessionId }`.
 */
export function buildPaymentSuccessPostMessage(
  sessionId: string | null | undefined
): { type: "payment_success"; sessionId: string | null } {
  return {
    type: "payment_success",
    sessionId: sessionId ?? null,
  };
}

/**
 * Whether a successful payment page should notify opener and schedule auto-close.
 * Requires success status and a live opener window.
 */
export function shouldNotifyOpenerAndAutoClose({
  status,
  hasOpener = false,
  openerClosed = true,
}: {
  status?: PaymentSuccessStatus | null;
  hasOpener?: boolean;
  openerClosed?: boolean;
} = {}): boolean {
  return status === "success" && !!hasOpener && !openerClosed;
}
