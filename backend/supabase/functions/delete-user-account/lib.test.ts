// Unit tests for delete-user-account lib
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  GRACE_DAYS,
  computeDeletionScheduledFor,
  existingDeletionSchedule,
  extractUserId,
  isValidDeleteConfirmation,
} from "./lib.ts";

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payloadB64 = btoa(JSON.stringify(payload));
  return `${header}.${payloadB64}.sig`;
}

Deno.test("extractUserId - Bearer token returns sub", () => {
  const jwt = makeJwt({ sub: "user-123" });
  assertEquals(extractUserId(`Bearer ${jwt}`), "user-123");
});

Deno.test("extractUserId - no Bearer returns null", () => {
  assertEquals(extractUserId(null), null);
  assertEquals(extractUserId(""), null);
  assertEquals(extractUserId("Basic xxx"), null);
});

Deno.test("extractUserId - malformed JWT returns null", () => {
  assertEquals(extractUserId("Bearer not-a-jwt"), null);
  assertEquals(extractUserId("Bearer a.b"), null);
});

Deno.test("isValidDeleteConfirmation - exact DELETE (trimmed) only", () => {
  assertEquals(isValidDeleteConfirmation("DELETE"), true);
  assertEquals(isValidDeleteConfirmation(" DELETE "), true);
  assertEquals(isValidDeleteConfirmation("delete"), false);
  assertEquals(isValidDeleteConfirmation("Delete"), false);
  assertEquals(isValidDeleteConfirmation("DELET"), false);
  assertEquals(isValidDeleteConfirmation(""), false);
  assertEquals(isValidDeleteConfirmation(null), false);
  assertEquals(isValidDeleteConfirmation(undefined), false);
  assertEquals(isValidDeleteConfirmation(123), false);
});

Deno.test("computeDeletionScheduledFor - defaults to 30 calendar days", () => {
  assertEquals(GRACE_DAYS, 30);
  const now = new Date("2026-07-01T12:00:00.000Z");
  const scheduled = computeDeletionScheduledFor(now);
  assertEquals(scheduled, new Date("2026-07-31T12:00:00.000Z").toISOString());
});

Deno.test("computeDeletionScheduledFor - respects custom grace days", () => {
  const now = new Date("2026-01-15T00:00:00.000Z");
  assertEquals(
    computeDeletionScheduledFor(now, 1),
    new Date("2026-01-16T00:00:00.000Z").toISOString()
  );
});

Deno.test("existingDeletionSchedule - returns prior schedule or null", () => {
  assertEquals(
    existingDeletionSchedule({ deletion_scheduled_for: "2026-08-01T00:00:00.000Z" }),
    "2026-08-01T00:00:00.000Z"
  );
  assertEquals(existingDeletionSchedule({ deletion_scheduled_for: null }), null);
  assertEquals(existingDeletionSchedule({ deletion_scheduled_for: "" }), null);
  assertEquals(existingDeletionSchedule(null), null);
  assertEquals(existingDeletionSchedule(undefined), null);
});
