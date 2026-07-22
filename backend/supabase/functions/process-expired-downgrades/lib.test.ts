// Unit tests for process-expired-downgrades lib
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  authorizeCron,
  isExpiredDowngradeCandidate,
  buildExpiredDowngradeUpdate,
  buildCycleAnchorReset,
  buildExpiredDowngradeChangeLog,
} from "./lib.ts";

const NOW = new Date("2026-07-22T10:00:00Z");

// ─── authorizeCron ──────────────────────────────────────────────────────────

Deno.test("authorizeCron - accepts matching Bearer secret", () => {
  assertEquals(authorizeCron("Bearer secret-abc", "secret-abc"), true);
});

Deno.test("authorizeCron - rejects missing/wrong secret", () => {
  assertEquals(authorizeCron("Bearer wrong", "secret-abc"), false);
  assertEquals(authorizeCron("Bearer secret-abc", ""), false);
  assertEquals(authorizeCron("Bearer secret-abc", null), false);
  assertEquals(authorizeCron(null, "secret-abc"), false);
  assertEquals(authorizeCron("Basic secret-abc", "secret-abc"), false);
  assertEquals(authorizeCron("", "secret-abc"), false);
});

// ─── isExpiredDowngradeCandidate ────────────────────────────────────────────

function candidate(overrides: Record<string, unknown> = {}) {
  return {
    user_id: "u1",
    status: "active",
    plan: "pro",
    auto_renew: false,
    downgrade_scheduled_for: "2026-07-21T00:00:00Z",
    stripe_subscription_id: "sub_123",
    ...overrides,
  };
}

Deno.test("isExpiredDowngradeCandidate - eligible when active, no renew, past schedule", () => {
  assertEquals(isExpiredDowngradeCandidate(candidate(), NOW), true);
  assertEquals(
    isExpiredDowngradeCandidate(candidate({ downgrade_scheduled_for: "2026-07-22T10:00:00Z" }), NOW),
    true
  );
});

Deno.test("isExpiredDowngradeCandidate - rejects future schedule", () => {
  assertEquals(
    isExpiredDowngradeCandidate(candidate({ downgrade_scheduled_for: "2026-07-23T00:00:00Z" }), NOW),
    false
  );
});

Deno.test("isExpiredDowngradeCandidate - rejects wrong status / auto_renew / null schedule", () => {
  assertEquals(isExpiredDowngradeCandidate(candidate({ status: "canceled" }), NOW), false);
  assertEquals(isExpiredDowngradeCandidate(candidate({ auto_renew: true }), NOW), false);
  assertEquals(isExpiredDowngradeCandidate(candidate({ auto_renew: null }), NOW), false);
  assertEquals(
    isExpiredDowngradeCandidate(candidate({ downgrade_scheduled_for: null }), NOW),
    false
  );
  assertEquals(isExpiredDowngradeCandidate(null, NOW), false);
});

Deno.test("isExpiredDowngradeCandidate - rejects invalid dates", () => {
  assertEquals(
    isExpiredDowngradeCandidate(candidate({ downgrade_scheduled_for: "not-a-date" }), NOW),
    false
  );
});

// ─── update / anchor / changelog payloads ───────────────────────────────────

Deno.test("buildExpiredDowngradeUpdate - clears Pro fields and marks expired", () => {
  const update = buildExpiredDowngradeUpdate(NOW);
  assertEquals(update.status, "canceled");
  assertEquals(update.plan, "free");
  assertEquals(update.auto_renew, false);
  assertEquals(update.downgrade_scheduled_for, null);
  assertEquals(update.downgrade_reason, "expired");
  assertEquals(update.stripe_subscription_id, null);
  assertEquals(update.current_period_end, null);
  assertEquals(update.updated_at, NOW.toISOString());
});

Deno.test("buildCycleAnchorReset - uses today YYYY-MM-DD for fresh free quota", () => {
  assertEquals(buildCycleAnchorReset(NOW), { cycle_anchor_date: "2026-07-22" });
  assertEquals(buildCycleAnchorReset(new Date("2026-01-05T23:59:59Z")), {
    cycle_anchor_date: "2026-01-05",
  });
});

Deno.test("buildExpiredDowngradeChangeLog - records previous plan/status", () => {
  const log = buildExpiredDowngradeChangeLog(candidate({ plan: "pro", status: "active" }));
  assertEquals(log, {
    user_id: "u1",
    action: "downgrade_now",
    reason: "expired",
    previous_status: "active",
    previous_plan: "pro",
    new_status: "canceled",
    new_plan: "free",
  });
});
