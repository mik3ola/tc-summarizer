// Pure Stripe Checkout SessionCreateParams builder — testable without Stripe SDK.
// Distinct from create-checkout/lib.ts helpers in parallel coverage PRs
// (auth extract / site URL / already-Pro / customer id-vs-email).

export type CheckoutCustomerFields = {
  customer?: string;
  customer_email?: string;
};

export type CheckoutSessionParams = {
  mode: "subscription";
  payment_method_types: ["card"];
  line_items: [{ price: string; quantity: 1 }];
  success_url: string;
  cancel_url: string;
  metadata: { user_id: string };
  customer?: string;
  customer_email?: string;
};

/**
 * Build the Stripe Checkout session create payload.
 * Locks money-path invariants:
 * - subscription mode + card only
 * - success URL must keep `{CHECKOUT_SESSION_ID}` for /success bootstrap
 * - cancel returns to /pricing
 * - metadata.user_id links checkout.session.completed → Supabase user
 * - customer id preferred over customer_email (caller supplies resolved fields)
 */
export function buildCheckoutSessionParams(args: {
  siteUrl: string;
  priceId: string;
  userId: string;
  customerFields?: CheckoutCustomerFields | null;
}): CheckoutSessionParams {
  const siteUrl = String(args.siteUrl || "").replace(/\/$/, "");
  const params: CheckoutSessionParams = {
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: args.priceId,
        quantity: 1,
      },
    ],
    success_url: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/pricing`,
    metadata: {
      user_id: args.userId,
    },
  };

  const customerId = args.customerFields?.customer;
  const customerEmail = args.customerFields?.customer_email;
  if (customerId) {
    params.customer = customerId;
  } else if (customerEmail) {
    params.customer_email = customerEmail;
  }

  return params;
}
