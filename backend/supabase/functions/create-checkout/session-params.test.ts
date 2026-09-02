import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { buildCheckoutSessionParams } from "./session-params.ts";

Deno.test("buildCheckoutSessionParams - locks mode, card, line item, and redirect URLs", () => {
  const params = buildCheckoutSessionParams({
    siteUrl: "https://termsdigest.com",
    priceId: "price_123",
    userId: "user-abc",
  });

  assertEquals(params.mode, "subscription");
  assertEquals(params.payment_method_types, ["card"]);
  assertEquals(params.line_items, [{ price: "price_123", quantity: 1 }]);
  assertEquals(
    params.success_url,
    "https://termsdigest.com/success?session_id={CHECKOUT_SESSION_ID}",
  );
  assertEquals(params.cancel_url, "https://termsdigest.com/pricing");
  assertEquals(params.metadata, { user_id: "user-abc" });
  assertEquals(params.customer, undefined);
  assertEquals(params.customer_email, undefined);
});

Deno.test("buildCheckoutSessionParams - strips trailing slash on siteUrl", () => {
  const params = buildCheckoutSessionParams({
    siteUrl: "https://termsdigest.com/",
    priceId: "price_123",
    userId: "user-abc",
  });
  assertEquals(
    params.success_url,
    "https://termsdigest.com/success?session_id={CHECKOUT_SESSION_ID}",
  );
  assertEquals(params.cancel_url, "https://termsdigest.com/pricing");
});

Deno.test("buildCheckoutSessionParams - prefers stripe customer id over email", () => {
  const params = buildCheckoutSessionParams({
    siteUrl: "https://termsdigest.com",
    priceId: "price_123",
    userId: "user-abc",
    customerFields: {
      customer: "cus_existing",
      customer_email: "should-not-use@example.com",
    },
  });
  assertEquals(params.customer, "cus_existing");
  assertEquals(params.customer_email, undefined);
});

Deno.test("buildCheckoutSessionParams - falls back to customer_email when no customer id", () => {
  const params = buildCheckoutSessionParams({
    siteUrl: "https://termsdigest.com",
    priceId: "price_123",
    userId: "user-abc",
    customerFields: { customer_email: "buyer@example.com" },
  });
  assertEquals(params.customer, undefined);
  assertEquals(params.customer_email, "buyer@example.com");
});

Deno.test("buildCheckoutSessionParams - empty customerFields leaves identity unset", () => {
  const params = buildCheckoutSessionParams({
    siteUrl: "https://termsdigest.com",
    priceId: "price_123",
    userId: "user-abc",
    customerFields: {},
  });
  assertEquals(params.customer, undefined);
  assertEquals(params.customer_email, undefined);
});
