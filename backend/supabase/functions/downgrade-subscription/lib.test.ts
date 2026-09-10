// Unit tests for downgrade-subscription lib
import { assertEquals, assertThrows } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { decodeJwtPayload, validateRequestBody, extractUserId } from "./lib.ts";

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

// boolean false is falsy under `|| "user_requested"` (distinct from null / numeric 0 cases elsewhere).
Deno.test("validateRequestBody - false reason defaults to user_requested", () => {
  const result = validateRequestBody({ action: "cancel_auto_renew", reason: false });
  assertEquals(result.reason, "user_requested");
  assertEquals(result.action, "cancel_auto_renew");
});

// null action fails the truthy gate the same way as missing action.
Deno.test("validateRequestBody - null action throws", () => {
  assertThrows(
    () => validateRequestBody({ action: null }),
    Error,
    "Invalid action",
  );
});

// Non-string truthy action fails includes() and must not be coerced.
Deno.test("validateRequestBody - boolean true action throws", () => {
  assertThrows(
    () => validateRequestBody({ action: true }),
    Error,
    "Invalid action",
  );
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

// Numeric sub is returned as-is (?? only nullishes null/undefined) — callers must not assume string.
Deno.test("extractUserId - numeric sub is returned as number", () => {
  const jwt = makeJwt({ sub: 42 });
  const sub = extractUserId(`Bearer ${jwt}`) as unknown;
  assertEquals(sub, 42 as unknown);
});

// Padding loop must handle payloads whose base64 length % 4 === 2 (needs "==").
Deno.test("decodeJwtPayload - pads when base64 length mod 4 is 2", () => {
  // "{\"a\":1}" → eyJhIjoxfQ (10 chars → needs "==")
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa('{"a\":1}').replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  assertEquals(payload.length % 4, 2);
  const result = decodeJwtPayload(`${header}.${payload}.sig`) as unknown;
  assertEquals((result as { a: number }).a, 1);
});
