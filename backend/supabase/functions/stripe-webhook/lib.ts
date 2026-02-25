// Pure logic for stripe-webhook - testable without mocks

export type DbStatus = "free" | "active" | "past_due" | "canceled";

export function mapStripeStatus(stripeStatus: string): DbStatus {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    default:
      return "free";
  }
}

export type ExistingSubscription = { plan: string; status?: string } | null;

export type SubscriptionUpdateData = {
  status: DbStatus;
  auto_renew: boolean;
  downgrade_scheduled_for: string | null;
  downgrade_reason: string | null;
  plan?: string;
  current_period_end?: string;
  updated_at: string;
};

/**
 * Builds the DB update payload for a Stripe subscription update event.
 * Pure function – does not touch Supabase or Stripe directly.
 */
export function buildSubscriptionUpdateData(
  stripeStatus: string,
  cancelAtPeriodEnd: boolean,
  currentPeriodEnd: string | null,
  existing: ExistingSubscription,
  now: string,
): SubscriptionUpdateData {
  const status = mapStripeStatus(stripeStatus);

  const data: SubscriptionUpdateData = {
    status,
    updated_at: now,
    auto_renew: !cancelAtPeriodEnd,
    downgrade_scheduled_for: cancelAtPeriodEnd ? currentPeriodEnd : null,
    downgrade_reason: cancelAtPeriodEnd ? "user_requested" : null,
  };

  // Never silently downgrade a Pro/Enterprise plan unless Stripe explicitly cancels it
  if (status === "canceled") {
    data.plan = "free";
  } else if (existing?.plan === "pro" || existing?.plan === "enterprise") {
    data.plan = existing.plan;
    if (stripeStatus === "active" || stripeStatus === "trialing") {
      data.status = "active";
    }
  }
  // No else: if no existing plan yet, don't set plan (checkout.session.completed will do it)

  if (currentPeriodEnd) {
    data.current_period_end = currentPeriodEnd;
  }

  return data;
}

/**
 * Returns true if a subscription.created event should be skipped
 * because checkout.session.completed already set Pro status.
 */
export function shouldSkipCreatedEvent(existing: ExistingSubscription): boolean {
  return !!(existing && existing.plan === "pro" && existing.status === "active");
}
