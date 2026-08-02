// Unit tests for downgrade-subscription lib
import { assertEquals, assertThrows } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  decodeJwtPayload,
  validateRequestBody,
  extractUserId,
  isPaidPlan,
  resolveDowngradeAction,
} from "./lib.ts";

// Create a minimal valid JWT: header.payload.signature (signature not verified in decode)
function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payloadB64 = btoa(JSON.stringify(payload));
  return `${header}.${payloadB64}.fake-signature`;
}

Deno.test("decodeJwtPayload - valid JWT returns payload", () => {
  const jwt = makeJwt({ sub: "user-123", email: "test@example.com" });
  const result = decodeJwtPayload(jwt);
  assertEquals(result?.sub, "user-123");
});

Deno.test("decodeJwtPayload - invalid JWT returns null", () => {
  assertEquals(decodeJwtPayload(""), null);
  assertEquals(decodeJwtPayload("not-a-jwt"), null);
  assertEquals(decodeJwtPayload("a.b"), null);
  assertEquals(decodeJwtPayload("a.b.c.d"), null);
});

Deno.test("decodeJwtPayload - malformed base64 returns null", () => {
  assertEquals(decodeJwtPayload("a.!!!.c"), null);
});

Deno.test("validateRequestBody - valid cancel_auto_renew", () => {
  const result = validateRequestBody({ action: "cancel_auto_renew", reason: "user_requested" });
  assertEquals(result, { action: "cancel_auto_renew", reason: "user_requested" });
});

Deno.test("validateRequestBody - valid downgrade_now", () => {
  const result = validateRequestBody({ action: "downgrade_now", reason: "expired" });
  assertEquals(result, { action: "downgrade_now", reason: "expired" });
});

Deno.test("validateRequestBody - defaults reason to user_requested", () => {
  const result = validateRequestBody({ action: "cancel_auto_renew" });
  assertEquals(result.reason, "user_requested");
});

Deno.test("validateRequestBody - invalid reason defaults to user_requested", () => {
  const result = validateRequestBody({ action: "downgrade_now", reason: "unknown" });
  assertEquals(result.reason, "user_requested");
});

Deno.test("validateRequestBody - invalid action throws", () => {
  assertThrows(
    () => validateRequestBody({ action: "invalid" }),
    Error,
    "Invalid action"
  );
});

Deno.test("validateRequestBody - missing action throws", () => {
  assertThrows(
    () => validateRequestBody({}),
    Error,
    "Invalid action"
  );
});

Deno.test("validateRequestBody - null body throws", () => {
  assertThrows(
    () => validateRequestBody(null),
    Error,
    "Invalid request body"
  );
});

Deno.test("extractUserId - Bearer token returns sub", () => {
  const jwt = makeJwt({ sub: "user-456" });
  assertEquals(extractUserId(`Bearer ${jwt}`), "user-456");
});

Deno.test("extractUserId - no Bearer returns null", () => {
  assertEquals(extractUserId(null), null);
  assertEquals(extractUserId(""), null);
  assertEquals(extractUserId("Basic xxx"), null);
});

Deno.test("extractUserId - invalid token returns null", () => {
  assertEquals(extractUserId("Bearer invalid"), null);
});

Deno.test("isPaidPlan - only pro and enterprise", () => {
  assertEquals(isPaidPlan("pro"), true);
  assertEquals(isPaidPlan("enterprise"), true);
  assertEquals(isPaidPlan("free"), false);
  assertEquals(isPaidPlan(null), false);
  assertEquals(isPaidPlan(undefined), false);
});

const paidSub = {
  status: "active",
  plan: "pro",
  auto_renew: true,
  current_period_end: "2026-09-01T00:00:00.000Z",
  downgrade_scheduled_for: null as string | null,
};

const fixedNow = new Date("2026-08-02T10:00:00.000Z");

Deno.test("resolveDowngradeAction - reject unpaid plans", () => {
  const outcome = resolveDowngradeAction(
    "cancel_auto_renew",
    { ...paidSub, plan: "free" },
    "user_requested",
    fixedNow
  );
  assertEquals(outcome.kind, "reject_unpaid");
});

Deno.test("resolveDowngradeAction - cancel_auto_renew is idempotent when already off", () => {
  const outcome = resolveDowngradeAction(
    "cancel_auto_renew",
    {
      ...paidSub,
      auto_renew: false,
      downgrade_scheduled_for: "2026-09-01T00:00:00.000Z",
    },
    "user_requested",
    fixedNow
  );
  assertEquals(outcome.kind, "cancel_noop");
  if (outcome.kind === "cancel_noop") {
    assertEquals(outcome.subscription.auto_renew, false);
    assertEquals(
      outcome.subscription.downgrade_scheduled_for,
      "2026-09-01T00:00:00.000Z"
    );
  }
});

Deno.test("resolveDowngradeAction - cancel_auto_renew schedules at period end", () => {
  const outcome = resolveDowngradeAction(
    "cancel_auto_renew",
    paidSub,
    "user_requested",
    fixedNow
  );
  assertEquals(outcome.kind, "cancel_schedule");
  if (outcome.kind === "cancel_schedule") {
    assertEquals(outcome.dbUpdate, {
      auto_renew: false,
      downgrade_scheduled_for: paidSub.current_period_end,
      downgrade_reason: "user_requested",
      updated_at: fixedNow.toISOString(),
    });
    assertEquals(outcome.subscription.status, "active");
    assertEquals(outcome.subscription.plan, "pro");
    assertEquals(outcome.subscription.auto_renew, false);
    assertEquals(
      outcome.subscription.downgrade_scheduled_for,
      paidSub.current_period_end
    );
    assertEquals(outcome.changeLog.new_status, "active");
    assertEquals(outcome.changeLog.new_plan, "pro");
  }
});

Deno.test("resolveDowngradeAction - re_enable_auto_renew clears schedule", () => {
  const outcome = resolveDowngradeAction(
    "re_enable_auto_renew",
    {
      ...paidSub,
      auto_renew: false,
      downgrade_scheduled_for: "2026-09-01T00:00:00.000Z",
    },
    "user_requested",
    fixedNow
  );
  assertEquals(outcome.kind, "reenable");
  if (outcome.kind === "reenable") {
    assertEquals(outcome.dbUpdate, {
      auto_renew: true,
      downgrade_scheduled_for: null,
      downgrade_reason: null,
      updated_at: fixedNow.toISOString(),
    });
    assertEquals(outcome.subscription.auto_renew, true);
    assertEquals(outcome.subscription.downgrade_scheduled_for, null);
  }
});

Deno.test("resolveDowngradeAction - re_enable noop when already on", () => {
  const outcome = resolveDowngradeAction(
    "re_enable_auto_renew",
    paidSub,
    "user_requested",
    fixedNow
  );
  assertEquals(outcome.kind, "reenable_noop");
});

Deno.test("resolveDowngradeAction - downgrade_now keeps Pro until period end", () => {
  const outcome = resolveDowngradeAction(
    "downgrade_now",
    paidSub,
    "user_requested",
    fixedNow
  );
  assertEquals(outcome.kind, "downgrade_schedule");
  if (outcome.kind === "downgrade_schedule") {
    assertEquals(outcome.subscription.plan, "pro");
    assertEquals(outcome.subscription.status, "active");
    assertEquals(outcome.subscription.auto_renew, false);
    assertEquals(
      outcome.subscription.downgrade_scheduled_for,
      paidSub.current_period_end
    );
    assertEquals(outcome.changeLog.new_plan, "pro");
    assertEquals(outcome.changeLog.new_status, "active");
  }
});

Deno.test("resolveDowngradeAction - downgrade_now without period end drops to free", () => {
  const outcome = resolveDowngradeAction(
    "downgrade_now",
    { ...paidSub, current_period_end: null },
    "expired",
    fixedNow
  );
  assertEquals(outcome.kind, "downgrade_immediate");
  if (outcome.kind === "downgrade_immediate") {
    assertEquals(outcome.dbUpdate, {
      status: "canceled",
      plan: "free",
      auto_renew: false,
      downgrade_scheduled_for: null,
      downgrade_reason: "expired",
      stripe_subscription_id: null,
      current_period_end: null,
      updated_at: fixedNow.toISOString(),
    });
    assertEquals(outcome.subscription, {
      status: "canceled",
      plan: "free",
      current_period_end: null,
    });
    assertEquals(outcome.changeLog.new_status, "canceled");
    assertEquals(outcome.changeLog.new_plan, "free");
  }
});
