// Pure logic for downgrade-subscription - testable without mocks

export function decodeJwtPayload(token: string): { sub: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    let payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (payload.length % 4 !== 0) payload += "=";
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export type Action = "cancel_auto_renew" | "re_enable_auto_renew" | "downgrade_now";
export type Reason = "user_requested" | "expired" | "payment_failed";

const VALID_ACTIONS: Action[] = ["cancel_auto_renew", "re_enable_auto_renew", "downgrade_now"];
const VALID_REASONS: Reason[] = ["user_requested", "expired", "payment_failed"];

export function validateRequestBody(body: unknown): { action: Action; reason: Reason } {
  const b = body as Record<string, unknown> | null;
  if (!b || typeof b !== "object") {
    throw new Error("Invalid request body");
  }
  const action = b.action as string | undefined;
  const reasonRaw = (b.reason as string) || "user_requested";
  const reason = VALID_REASONS.includes(reasonRaw as Reason) ? (reasonRaw as Reason) : "user_requested";

  if (!action || !VALID_ACTIONS.includes(action as Action)) {
    throw new Error("Invalid action. Use cancel_auto_renew, re_enable_auto_renew, or downgrade_now");
  }
  return { action: action as Action, reason };
}

export function extractUserId(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const payload = decodeJwtPayload(authHeader.replace("Bearer ", ""));
  return payload?.sub ?? null;
}

export function isPaidPlan(plan: unknown): boolean {
  return plan === "pro" || plan === "enterprise";
}

export type SubscriptionRow = {
  status: string;
  plan: string;
  auto_renew?: boolean | null;
  current_period_end?: string | null;
  downgrade_scheduled_for?: string | null;
};

export type SubscriptionResponse = {
  status: string;
  plan: string;
  current_period_end?: string | null;
  auto_renew?: boolean;
  downgrade_scheduled_for?: string | null;
};

export type ChangeLogFields = {
  action: Action;
  reason: Reason;
  previous_status: string;
  previous_plan: string;
  new_status: string;
  new_plan: string;
};

export type DowngradeOutcome =
  | { kind: "reject_unpaid" }
  | { kind: "cancel_noop"; subscription: SubscriptionResponse }
  | {
      kind: "cancel_schedule";
      dbUpdate: Record<string, unknown>;
      subscription: SubscriptionResponse;
      changeLog: ChangeLogFields;
    }
  | { kind: "reenable_noop"; subscription: SubscriptionResponse }
  | {
      kind: "reenable";
      dbUpdate: Record<string, unknown>;
      subscription: SubscriptionResponse;
      changeLog: ChangeLogFields;
    }
  | {
      kind: "downgrade_schedule";
      dbUpdate: Record<string, unknown>;
      subscription: SubscriptionResponse;
      changeLog: ChangeLogFields;
    }
  | {
      kind: "downgrade_immediate";
      dbUpdate: Record<string, unknown>;
      subscription: SubscriptionResponse;
      changeLog: ChangeLogFields;
    };

/**
 * Pure branching for cancel / re-enable / downgrade_now outcomes.
 * Keeps Pro-until-period-end vs immediate-free policy regression-safe.
 * Stripe side-effects stay in the Edge Function handler.
 */
export function resolveDowngradeAction(
  action: Action,
  sub: SubscriptionRow,
  reason: Reason,
  now: Date = new Date()
): DowngradeOutcome {
  if (!isPaidPlan(sub.plan)) {
    return { kind: "reject_unpaid" };
  }

  const previousStatus = sub.status;
  const previousPlan = sub.plan;
  const currentPeriodEnd = sub.current_period_end ?? null;
  const updatedAt = now.toISOString();

  if (action === "cancel_auto_renew") {
    if (!sub.auto_renew) {
      return {
        kind: "cancel_noop",
        subscription: {
          status: sub.status,
          plan: sub.plan,
          current_period_end: currentPeriodEnd,
          auto_renew: false,
          downgrade_scheduled_for: sub.downgrade_scheduled_for ?? null,
        },
      };
    }

    return {
      kind: "cancel_schedule",
      dbUpdate: {
        auto_renew: false,
        downgrade_scheduled_for: currentPeriodEnd,
        downgrade_reason: reason,
        updated_at: updatedAt,
      },
      subscription: {
        status: "active",
        plan: previousPlan,
        current_period_end: currentPeriodEnd,
        auto_renew: false,
        downgrade_scheduled_for: currentPeriodEnd,
      },
      changeLog: {
        action: "cancel_auto_renew",
        reason,
        previous_status: previousStatus,
        previous_plan: previousPlan,
        new_status: "active",
        new_plan: previousPlan,
      },
    };
  }

  if (action === "re_enable_auto_renew") {
    if (sub.auto_renew) {
      return {
        kind: "reenable_noop",
        subscription: {
          status: sub.status,
          plan: sub.plan,
          current_period_end: currentPeriodEnd,
          auto_renew: true,
          downgrade_scheduled_for: null,
        },
      };
    }

    return {
      kind: "reenable",
      dbUpdate: {
        auto_renew: true,
        downgrade_scheduled_for: null,
        downgrade_reason: null,
        updated_at: updatedAt,
      },
      subscription: {
        status: "active",
        plan: previousPlan,
        current_period_end: currentPeriodEnd,
        auto_renew: true,
        downgrade_scheduled_for: null,
      },
      changeLog: {
        action: "re_enable_auto_renew",
        reason,
        previous_status: previousStatus,
        previous_plan: previousPlan,
        new_status: "active",
        new_plan: previousPlan,
      },
    };
  }

  // action === "downgrade_now"
  // Keep Pro for remaining paid period; only drop to free when no period end.
  if (currentPeriodEnd) {
    return {
      kind: "downgrade_schedule",
      dbUpdate: {
        auto_renew: false,
        downgrade_scheduled_for: currentPeriodEnd,
        downgrade_reason: reason,
        updated_at: updatedAt,
      },
      subscription: {
        status: previousStatus,
        plan: previousPlan,
        current_period_end: currentPeriodEnd,
        auto_renew: false,
        downgrade_scheduled_for: currentPeriodEnd,
      },
      changeLog: {
        action: "downgrade_now",
        reason,
        previous_status: previousStatus,
        previous_plan: previousPlan,
        new_status: previousStatus,
        new_plan: previousPlan,
      },
    };
  }

  return {
    kind: "downgrade_immediate",
    dbUpdate: {
      status: "canceled",
      plan: "free",
      auto_renew: false,
      downgrade_scheduled_for: null,
      downgrade_reason: reason,
      stripe_subscription_id: null,
      current_period_end: null,
      updated_at: updatedAt,
    },
    subscription: {
      status: "canceled",
      plan: "free",
      current_period_end: null,
    },
    changeLog: {
      action: "downgrade_now",
      reason,
      previous_status: previousStatus,
      previous_plan: previousPlan,
      new_status: "canceled",
      new_plan: "free",
    },
  };
}
