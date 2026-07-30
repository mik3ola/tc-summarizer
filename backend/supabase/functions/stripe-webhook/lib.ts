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

/** Convert Stripe unix-seconds timestamps to ISO, or null when missing/invalid. */
export function stripeUnixToIso(unixSeconds: unknown): string | null {
  if (typeof unixSeconds !== "number" || !Number.isFinite(unixSeconds)) {
    return null;
  }
  try {
    const iso = new Date(unixSeconds * 1000).toISOString();
    return iso;
  } catch {
    return null;
  }
}

/** user_id from Checkout Session metadata — required to attribute the upgrade. */
export function extractCheckoutUserId(
  metadata: { user_id?: unknown } | null | undefined,
): string | null {
  const userId = metadata?.user_id;
  return typeof userId === "string" && userId.length > 0 ? userId : null;
}

export type CheckoutCompletedSubscriptionUpdate = {
  status: "active";
  plan: "pro";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  auto_renew: true;
  downgrade_scheduled_for: null;
  downgrade_reason: null;
  updated_at: string;
};

/**
 * DB payload after checkout.session.completed — activates Pro and clears any
 * pending downgrade. Cycle-anchor reset is handled separately on profiles.
 */
export function buildCheckoutCompletedUpdate(
  customerId: string | null,
  subscriptionId: string | null,
  nowIso: string,
): CheckoutCompletedSubscriptionUpdate {
  return {
    status: "active",
    plan: "pro",
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    auto_renew: true,
    downgrade_scheduled_for: null,
    downgrade_reason: null,
    updated_at: nowIso,
  };
}

/** YYYY-MM-DD used as profiles.cycle_anchor_date when Pro activates. */
export function upgradeCycleAnchorDate(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export type SubscriptionDeletedUpdate = {
  status: "canceled";
  plan: "free";
  auto_renew: false;
  downgrade_scheduled_for: null;
  downgrade_reason: null;
  stripe_subscription_id: null;
  current_period_end: null;
  updated_at: string;
};

/**
 * DB payload when Stripe reports subscription.deleted — force Free and clear
 * Stripe linkage / period end so usage falls back to Free quota immediately.
 */
export function buildSubscriptionDeletedUpdate(nowIso: string): SubscriptionDeletedUpdate {
  return {
    status: "canceled",
    plan: "free",
    auto_renew: false,
    downgrade_scheduled_for: null,
    downgrade_reason: null,
    stripe_subscription_id: null,
    current_period_end: null,
    updated_at: nowIso,
  };
}
