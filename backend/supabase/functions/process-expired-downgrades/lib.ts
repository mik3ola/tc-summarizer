// Pure logic for process-expired-downgrades cron — testable without Supabase/Stripe mocks

export type ExpiredDowngradeCandidate = {
  user_id: string;
  status: string;
  plan: string;
  auto_renew?: boolean | null;
  downgrade_scheduled_for?: string | null;
  stripe_subscription_id?: string | null;
};

/**
 * Cron auth: Authorization: Bearer <CRON_SECRET>
 */
export function authorizeCron(
  authHeader: string | null,
  cronSecret: string | undefined | null
): boolean {
  if (!cronSecret) return false;
  const provided = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  return provided === cronSecret;
}

/**
 * Whether a subscription row should be processed by the expired-downgrade cron.
 * Mirrors the DB filters: active, auto_renew=false, scheduled_for <= now.
 */
export function isExpiredDowngradeCandidate(
  sub: ExpiredDowngradeCandidate | null | undefined,
  now: Date | string = new Date()
): boolean {
  if (!sub) return false;
  if (sub.status !== "active") return false;
  if (sub.auto_renew !== false) return false;
  if (!sub.downgrade_scheduled_for) return false;

  const nowMs = typeof now === "string" ? new Date(now).getTime() : now.getTime();
  const scheduledMs = new Date(sub.downgrade_scheduled_for).getTime();
  if (Number.isNaN(nowMs) || Number.isNaN(scheduledMs)) return false;
  return scheduledMs <= nowMs;
}

/** Payload written to subscriptions when an expired downgrade completes. */
export function buildExpiredDowngradeUpdate(now: Date = new Date()) {
  return {
    status: "canceled" as const,
    plan: "free" as const,
    auto_renew: false,
    downgrade_scheduled_for: null,
    downgrade_reason: "expired" as const,
    stripe_subscription_id: null,
    current_period_end: null,
    updated_at: now.toISOString(),
  };
}

/**
 * After Pro→free via expired cron, reset cycle anchor to today so the user
 * starts a fresh free quota period instead of inheriting Pro-period usage.
 */
export function buildCycleAnchorReset(today: Date = new Date()): { cycle_anchor_date: string } {
  return { cycle_anchor_date: today.toISOString().slice(0, 10) };
}

export function buildExpiredDowngradeChangeLog(sub: ExpiredDowngradeCandidate) {
  return {
    user_id: sub.user_id,
    action: "downgrade_now" as const,
    reason: "expired" as const,
    previous_status: sub.status,
    previous_plan: sub.plan,
    new_status: "canceled" as const,
    new_plan: "free" as const,
  };
}
