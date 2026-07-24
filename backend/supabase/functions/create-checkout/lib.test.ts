import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  decodeJwtPayload,
  extractCheckoutUser,
  isAlreadyProSubscriber,
  resolveCheckoutCustomer,
  resolveCheckoutSiteUrl,
} from "./lib.ts";

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payloadB64 = btoa(JSON.stringify(payload));
  return `${header}.${payloadB64}.fake-signature`;
}

// ─── decodeJwtPayload / extractCheckoutUser ─────────────────────────────────

Deno.test("decodeJwtPayload - valid JWT returns sub and email", () => {
  const jwt = makeJwt({ sub: "user-123", email: "a@example.com" });
  const result = decodeJwtPayload(jwt);
  assertEquals(result?.sub, "user-123");
  assertEquals(result?.email, "a@example.com");
});

Deno.test("decodeJwtPayload - invalid JWT returns null", () => {
  assertEquals(decodeJwtPayload(""), null);
  assertEquals(decodeJwtPayload("not-a-jwt"), null);
  assertEquals(decodeJwtPayload("a.b"), null);
  assertEquals(decodeJwtPayload("a.!!!.c"), null);
});

Deno.test("extractCheckoutUser - Bearer token yields user id/email", () => {
  const jwt = makeJwt({ sub: "user-abc", email: "pro@example.com" });
  assertEquals(extractCheckoutUser(`Bearer ${jwt}`), {
    userId: "user-abc",
    userEmail: "pro@example.com",
  });
});

Deno.test("extractCheckoutUser - rejects missing/non-Bearer/missing-sub", () => {
  assertEquals(extractCheckoutUser(null), null);
  assertEquals(extractCheckoutUser(""), null);
  assertEquals(extractCheckoutUser("Basic xxx"), null);
  const noSub = makeJwt({ email: "x@example.com" });
  assertEquals(extractCheckoutUser(`Bearer ${noSub}`), null);
});

// ─── resolveCheckoutSiteUrl ─────────────────────────────────────────────────

Deno.test("resolveCheckoutSiteUrl - defaults when unset or localhost", () => {
  assertEquals(resolveCheckoutSiteUrl(undefined), "https://termsdigest.com");
  assertEquals(resolveCheckoutSiteUrl(null), "https://termsdigest.com");
  assertEquals(resolveCheckoutSiteUrl(""), "https://termsdigest.com");
  assertEquals(
    resolveCheckoutSiteUrl("http://localhost:3000"),
    "https://termsdigest.com"
  );
  assertEquals(
    resolveCheckoutSiteUrl("https://preview.localhost"),
    "https://termsdigest.com"
  );
});

Deno.test("resolveCheckoutSiteUrl - keeps non-localhost production URLs", () => {
  assertEquals(
    resolveCheckoutSiteUrl("https://termsdigest.com"),
    "https://termsdigest.com"
  );
  assertEquals(
    resolveCheckoutSiteUrl("https://staging.example.com"),
    "https://staging.example.com"
  );
});

// ─── isAlreadyProSubscriber ─────────────────────────────────────────────────

Deno.test("isAlreadyProSubscriber - only active pro blocks checkout", () => {
  assertEquals(isAlreadyProSubscriber({ status: "active", plan: "pro" }), true);
  assertEquals(isAlreadyProSubscriber({ status: "active", plan: "free" }), false);
  assertEquals(isAlreadyProSubscriber({ status: "canceled", plan: "pro" }), false);
  assertEquals(isAlreadyProSubscriber({ status: "active", plan: null }), false);
  assertEquals(isAlreadyProSubscriber(null), false);
  assertEquals(isAlreadyProSubscriber(undefined), false);
});

// ─── resolveCheckoutCustomer ────────────────────────────────────────────────

Deno.test("resolveCheckoutCustomer - prefers stripe_customer_id over email", () => {
  assertEquals(
    resolveCheckoutCustomer({
      subscription: { stripe_customer_id: "cus_123" },
      userEmail: "a@example.com",
    }),
    { customer: "cus_123" }
  );
});

Deno.test("resolveCheckoutCustomer - falls back to email then empty", () => {
  assertEquals(
    resolveCheckoutCustomer({
      subscription: { stripe_customer_id: null },
      userEmail: "a@example.com",
    }),
    { customer_email: "a@example.com" }
  );
  assertEquals(
    resolveCheckoutCustomer({ subscription: null, userEmail: null }),
    {}
  );
  assertEquals(
    resolveCheckoutCustomer({ subscription: undefined, userEmail: "" }),
    {}
  );
});
