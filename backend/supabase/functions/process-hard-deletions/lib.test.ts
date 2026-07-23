import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  authorizeCron,
  buildHardDeletionResult,
  isHardDeletionCandidate,
} from "./lib.ts";

Deno.test("authorizeCron - accepts matching Bearer secret", () => {
  assertEquals(authorizeCron("Bearer secret-abc", "secret-abc"), true);
});

Deno.test("authorizeCron - rejects missing/mismatched/non-Bearer auth", () => {
  assertEquals(authorizeCron(null, "secret-abc"), false);
  assertEquals(authorizeCron("", "secret-abc"), false);
  assertEquals(authorizeCron("Bearer wrong", "secret-abc"), false);
  assertEquals(authorizeCron("Basic secret-abc", "secret-abc"), false);
  assertEquals(authorizeCron("Bearer secret-abc", null), false);
  assertEquals(authorizeCron("Bearer secret-abc", ""), false);
  assertEquals(authorizeCron("Bearer secret-abc", undefined), false);
});

Deno.test("isHardDeletionCandidate - due scheduled deletion is eligible", () => {
  const now = "2026-07-23T10:00:00.000Z";
  assertEquals(
    isHardDeletionCandidate(
      { user_id: "u1", deletion_scheduled_for: "2026-07-23T09:59:59.000Z" },
      now
    ),
    true
  );
  assertEquals(
    isHardDeletionCandidate(
      { user_id: "u1", deletion_scheduled_for: "2026-07-23T10:00:00.000Z" },
      now
    ),
    true
  );
});

Deno.test("isHardDeletionCandidate - future schedule is not eligible", () => {
  assertEquals(
    isHardDeletionCandidate(
      { user_id: "u1", deletion_scheduled_for: "2026-07-24T00:00:00.000Z" },
      "2026-07-23T10:00:00.000Z"
    ),
    false
  );
});

Deno.test("isHardDeletionCandidate - null/empty schedule or profile rejected", () => {
  const now = "2026-07-23T10:00:00.000Z";
  assertEquals(isHardDeletionCandidate(null, now), false);
  assertEquals(isHardDeletionCandidate(undefined, now), false);
  assertEquals(isHardDeletionCandidate({ user_id: "u1" }, now), false);
  assertEquals(
    isHardDeletionCandidate({ user_id: "u1", deletion_scheduled_for: null }, now),
    false
  );
  assertEquals(
    isHardDeletionCandidate({ user_id: "u1", deletion_scheduled_for: "" }, now),
    false
  );
  assertEquals(
    isHardDeletionCandidate({ user_id: "", deletion_scheduled_for: "2026-07-01T00:00:00Z" }, now),
    false
  );
});

Deno.test("isHardDeletionCandidate - invalid dates rejected", () => {
  assertEquals(
    isHardDeletionCandidate(
      { user_id: "u1", deletion_scheduled_for: "not-a-date" },
      "2026-07-23T10:00:00.000Z"
    ),
    false
  );
});

Deno.test("buildHardDeletionResult - counts deleted and errors", () => {
  assertEquals(buildHardDeletionResult(["a", "b"], [{ user_id: "c", error: "x" }]), {
    success: true,
    deleted: 2,
    errors: 1,
  });
  assertEquals(buildHardDeletionResult([], []), {
    success: true,
    deleted: 0,
    errors: 0,
  });
});
