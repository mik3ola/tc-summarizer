// Pure post-auth account-deletion outcomes — testable without Supabase/Stripe mocks.
// Distinct from delete-user-account/lib.ts in parallel coverage PR #20
// (JWT extract / DELETE confirmation / grace-day schedule / existingDeletionSchedule).
// This module locks Stripe cancel gating and the JSON response / profile-patch shapes
// after auth + confirmation have already succeeded.

export const ALREADY_SCHEDULED_DELETION_MESSAGE = "Deletion already scheduled";
export const NEWLY_SCHEDULED_DELETION_MESSAGE =
  "Account will be permanently deleted in 30 days";

/**
 * Whether delete-user-account should attempt stripe.subscriptions.cancel
 * before writing the 30-day deletion schedule.
 * Historical gate: truthy STRIPE_SECRET_KEY and truthy stripe_subscription_id
 * (empty string skips; whitespace-only id still attempts — do not trim casually).
 */
export function shouldCancelStripeSubscription(args: {
  stripeSecretKey?: string | null;
  stripeSubscriptionId?: string | null;
}): boolean {
  return !!(args.stripeSecretKey && args.stripeSubscriptionId);
}

export type DeletionScheduleSuccessResponse = {
  success: true;
  deletion_scheduled_for: string;
  message: string;
};

/** Idempotent success body when profiles.deletion_scheduled_for is already set. */
export function buildAlreadyScheduledDeletionResponse(
  deletionScheduledFor: string,
): DeletionScheduleSuccessResponse {
  return {
    success: true,
    deletion_scheduled_for: deletionScheduledFor,
    message: ALREADY_SCHEDULED_DELETION_MESSAGE,
  };
}

/** Success body after a new 30-day deletion schedule is written. */
export function buildNewlyScheduledDeletionResponse(
  deletionScheduledFor: string,
): DeletionScheduleSuccessResponse {
  return {
    success: true,
    deletion_scheduled_for: deletionScheduledFor,
    message: NEWLY_SCHEDULED_DELETION_MESSAGE,
  };
}

/** Profile patch that records the hard-deletion timestamp. */
export function buildDeletionScheduleProfileUpdate(
  deletionScheduledFor: string,
): { deletion_scheduled_for: string } {
  return { deletion_scheduled_for: deletionScheduledFor };
}
