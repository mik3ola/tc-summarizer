// Unit tests for stripe-webhook lib
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  mapStripeStatus,
  buildSubscriptionUpdateData,
  shouldSkipCreatedEvent,
  stripeUnixToIso,
  extractCheckoutUserId,
  buildCheckoutCompletedUpdate,
  upgradeCycleAnchorDate,
  buildSubscriptionDeletedUpdate,
} from "./lib.ts";

const NOW = "2026-02-01T00:00:00.000Z";
const PERIOD_END = "2026-03-01T00:00:00.000Z";

// ─── mapStripeStatus ────────────────────────────────────────────────────────

Deno.test("mapStripeStatus - active → active", () => {
  assertEquals(mapStripeStatus("active"), "active");
});

Deno.test("mapStripeStatus - trialing → active", () => {
  assertEquals(mapStripeStatus("trialing"), "active");
});

Deno.test("mapStripeStatus - past_due → past_due", () => {
  assertEquals(mapStripeStatus("past_due"), "past_due");
});

Deno.test("mapStripeStatus - unpaid → past_due", () => {
  assertEquals(mapStripeStatus("unpaid"), "past_due");
});

Deno.test("mapStripeStatus - canceled → canceled", () => {
  assertEquals(mapStripeStatus("canceled"), "canceled");
});

Deno.test("mapStripeStatus - incomplete_expired → canceled", () => {
  assertEquals(mapStripeStatus("incomplete_expired"), "canceled");
});

Deno.test("mapStripeStatus - unknown → free", () => {
  assertEquals(mapStripeStatus("incomplete"), "free");
  assertEquals(mapStripeStatus(""), "free");
});

// ─── buildSubscriptionUpdateData ────────────────────────────────────────────

Deno.test("buildSubscriptionUpdateData - active, auto-renew on, no existing plan", () => {
  const result = buildSubscriptionUpdateData("active", false, PERIOD_END, null, NOW);
  assertEquals(result.status, "active");
  assertEquals(result.auto_renew, true);
  assertEquals(result.downgrade_scheduled_for, null);
  assertEquals(result.downgrade_reason, null);
  assertEquals(result.current_period_end, PERIOD_END);
  assertEquals(result.plan, undefined); // checkout.session.completed sets the plan
});

Deno.test("buildSubscriptionUpdateData - cancel_at_period_end sets auto_renew=false and schedules downgrade", () => {
  const result = buildSubscriptionUpdateData("active", true, PERIOD_END, { plan: "pro" }, NOW);
  assertEquals(result.auto_renew, false);
  assertEquals(result.downgrade_scheduled_for, PERIOD_END);
  assertEquals(result.downgrade_reason, "user_requested");
});

Deno.test("buildSubscriptionUpdateData - cancel_at_period_end with no period end sets null", () => {
  const result = buildSubscriptionUpdateData("active", true, null, { plan: "pro" }, NOW);
  assertEquals(result.auto_renew, false);
  assertEquals(result.downgrade_scheduled_for, null);
});

Deno.test("buildSubscriptionUpdateData - re-enabling auto-renew clears downgrade fields", () => {
  const result = buildSubscriptionUpdateData("active", false, PERIOD_END, { plan: "pro" }, NOW);
  assertEquals(result.auto_renew, true);
  assertEquals(result.downgrade_scheduled_for, null);
  assertEquals(result.downgrade_reason, null);
});

Deno.test("buildSubscriptionUpdateData - existing pro plan is preserved on active status", () => {
  const result = buildSubscriptionUpdateData("active", false, PERIOD_END, { plan: "pro" }, NOW);
  assertEquals(result.plan, "pro");
  assertEquals(result.status, "active");
});

Deno.test("buildSubscriptionUpdateData - existing enterprise plan is preserved", () => {
  const result = buildSubscriptionUpdateData("active", false, PERIOD_END, { plan: "enterprise" }, NOW);
  assertEquals(result.plan, "enterprise");
});

Deno.test("buildSubscriptionUpdateData - pro plan preserved during trialing", () => {
  const result = buildSubscriptionUpdateData("trialing", false, PERIOD_END, { plan: "pro" }, NOW);
  assertEquals(result.plan, "pro");
  assertEquals(result.status, "active");
});

Deno.test("buildSubscriptionUpdateData - canceled status sets plan to free", () => {
  const result = buildSubscriptionUpdateData("canceled", false, null, { plan: "pro" }, NOW);
  assertEquals(result.status, "canceled");
  assertEquals(result.plan, "free");
});

Deno.test("buildSubscriptionUpdateData - no current_period_end means field is omitted", () => {
  const result = buildSubscriptionUpdateData("active", false, null, null, NOW);
  assertEquals(result.current_period_end, undefined);
});

Deno.test("buildSubscriptionUpdateData - updated_at is set to provided now", () => {
  const result = buildSubscriptionUpdateData("active", false, null, null, NOW);
  assertEquals(result.updated_at, NOW);
});

// ─── shouldSkipCreatedEvent ─────────────────────────────────────────────────

Deno.test("shouldSkipCreatedEvent - skips when existing is pro+active", () => {
  assertEquals(shouldSkipCreatedEvent({ plan: "pro", status: "active" }), true);
});

Deno.test("shouldSkipCreatedEvent - does not skip when existing is pro but not active", () => {
  assertEquals(shouldSkipCreatedEvent({ plan: "pro", status: "canceled" }), false);
});

Deno.test("shouldSkipCreatedEvent - does not skip when existing is free", () => {
  assertEquals(shouldSkipCreatedEvent({ plan: "free", status: "active" }), false);
});

Deno.test("shouldSkipCreatedEvent - does not skip when no existing record", () => {
  assertEquals(shouldSkipCreatedEvent(null), false);
});

// ─── stripeUnixToIso ────────────────────────────────────────────────────────

Deno.test("stripeUnixToIso - converts unix seconds to ISO", () => {
  assertEquals(stripeUnixToIso(1_735_689_600), "2025-01-01T00:00:00.000Z");
});

Deno.test("stripeUnixToIso - returns null for non-numbers", () => {
  assertEquals(stripeUnixToIso(null), null);
  assertEquals(stripeUnixToIso("1735689600"), null);
  assertEquals(stripeUnixToIso(Number.NaN), null);
});

// ─── extractCheckoutUserId ──────────────────────────────────────────────────

Deno.test("extractCheckoutUserId - requires non-empty string user_id", () => {
  assertEquals(extractCheckoutUserId({ user_id: "user-abc" }), "user-abc");
  assertEquals(extractCheckoutUserId({ user_id: "" }), null);
  assertEquals(extractCheckoutUserId({}), null);
  assertEquals(extractCheckoutUserId(null), null);
});

// ─── buildCheckoutCompletedUpdate ───────────────────────────────────────────

Deno.test("buildCheckoutCompletedUpdate - activates Pro and clears downgrade", () => {
  const result = buildCheckoutCompletedUpdate("cus_1", "sub_1", NOW);
  assertEquals(result.status, "active");
  assertEquals(result.plan, "pro");
  assertEquals(result.stripe_customer_id, "cus_1");
  assertEquals(result.stripe_subscription_id, "sub_1");
  assertEquals(result.auto_renew, true);
  assertEquals(result.downgrade_scheduled_for, null);
  assertEquals(result.downgrade_reason, null);
  assertEquals(result.updated_at, NOW);
});

Deno.test("buildCheckoutCompletedUpdate - allows null Stripe ids", () => {
  const result = buildCheckoutCompletedUpdate(null, null, NOW);
  assertEquals(result.stripe_customer_id, null);
  assertEquals(result.stripe_subscription_id, null);
  assertEquals(result.plan, "pro");
});

Deno.test("upgradeCycleAnchorDate - returns YYYY-MM-DD in UTC", () => {
  assertEquals(upgradeCycleAnchorDate(new Date("2026-07-30T15:22:00Z")), "2026-07-30");
});

// ─── buildSubscriptionDeletedUpdate ─────────────────────────────────────────

Deno.test("buildSubscriptionDeletedUpdate - forces Free and clears Stripe linkage", () => {
  const result = buildSubscriptionDeletedUpdate(NOW);
  assertEquals(result.status, "canceled");
  assertEquals(result.plan, "free");
  assertEquals(result.auto_renew, false);
  assertEquals(result.downgrade_scheduled_for, null);
  assertEquals(result.downgrade_reason, null);
  assertEquals(result.stripe_subscription_id, null);
  assertEquals(result.current_period_end, null);
  assertEquals(result.updated_at, NOW);
});
