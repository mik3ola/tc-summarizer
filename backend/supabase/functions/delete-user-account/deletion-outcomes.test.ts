import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  ALREADY_SCHEDULED_DELETION_MESSAGE,
  NEWLY_SCHEDULED_DELETION_MESSAGE,
  buildAlreadyScheduledDeletionResponse,
  buildDeletionScheduleProfileUpdate,
  buildNewlyScheduledDeletionResponse,
  shouldCancelStripeSubscription,
} from "./deletion-outcomes.ts";

Deno.test("shouldCancelStripeSubscription - requires both secret and subscription id", () => {
  assertEquals(
    shouldCancelStripeSubscription({
      stripeSecretKey: "sk_test",
      stripeSubscriptionId: "sub_123",
    }),
    true,
  );
  assertEquals(
    shouldCancelStripeSubscription({
      stripeSecretKey: "",
      stripeSubscriptionId: "sub_123",
    }),
    false,
  );
  assertEquals(
    shouldCancelStripeSubscription({
      stripeSecretKey: null,
      stripeSubscriptionId: "sub_123",
    }),
    false,
  );
  assertEquals(
    shouldCancelStripeSubscription({
      stripeSecretKey: "sk_test",
      stripeSubscriptionId: "",
    }),
    false,
  );
  assertEquals(
    shouldCancelStripeSubscription({
      stripeSecretKey: "sk_test",
      stripeSubscriptionId: null,
    }),
    false,
  );
  assertEquals(
    shouldCancelStripeSubscription({
      stripeSecretKey: undefined,
      stripeSubscriptionId: undefined,
    }),
    false,
  );
});

Deno.test("shouldCancelStripeSubscription - does not trim (historical truthy gate)", () => {
  // Whitespace-only id is truthy in JS; keep parity with index.ts `&&` check.
  assertEquals(
    shouldCancelStripeSubscription({
      stripeSecretKey: "sk_test",
      stripeSubscriptionId: "   ",
    }),
    true,
  );
});

Deno.test("buildAlreadyScheduledDeletionResponse - locks idempotent success shape", () => {
  assertEquals(
    buildAlreadyScheduledDeletionResponse("2026-10-01T00:00:00.000Z"),
    {
      success: true,
      deletion_scheduled_for: "2026-10-01T00:00:00.000Z",
      message: ALREADY_SCHEDULED_DELETION_MESSAGE,
    },
  );
  assertEquals(
    ALREADY_SCHEDULED_DELETION_MESSAGE,
    "Deletion already scheduled",
  );
});

Deno.test("buildNewlyScheduledDeletionResponse - locks 30-day success copy", () => {
  assertEquals(
    buildNewlyScheduledDeletionResponse("2026-10-03T12:00:00.000Z"),
    {
      success: true,
      deletion_scheduled_for: "2026-10-03T12:00:00.000Z",
      message: NEWLY_SCHEDULED_DELETION_MESSAGE,
    },
  );
  assertEquals(
    NEWLY_SCHEDULED_DELETION_MESSAGE,
    "Account will be permanently deleted in 30 days",
  );
});

Deno.test("buildDeletionScheduleProfileUpdate - only sets deletion_scheduled_for", () => {
  assertEquals(
    buildDeletionScheduleProfileUpdate("2026-10-03T12:00:00.000Z"),
    { deletion_scheduled_for: "2026-10-03T12:00:00.000Z" },
  );
});
