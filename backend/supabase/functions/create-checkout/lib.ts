// Pure logic for create-checkout — testable without Stripe/Supabase mocks

export type JwtPayload = { sub: string; email?: string };

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    let payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (payload.length % 4 !== 0) payload += "=";

    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

/** Extract user id/email from Authorization: Bearer <jwt>. */
export function extractCheckoutUser(
  authHeader: string | null | undefined
): { userId: string; userEmail: string | null } | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const payload = decodeJwtPayload(authHeader.slice(7));
  if (!payload?.sub) return null;
  return {
    userId: payload.sub,
    userEmail: payload.email || null,
  };
}

/**
 * Checkout success/cancel URLs must never point at localhost in production.
 * Mirrors summarize's resolvedSiteUrl policy.
 */
export function resolveCheckoutSiteUrl(envSiteUrl: string | undefined | null): string {
  return envSiteUrl && !envSiteUrl.includes("localhost")
    ? envSiteUrl
    : "https://termsdigest.com";
}

export type SubscriptionRow = {
  status?: string | null;
  plan?: string | null;
  stripe_customer_id?: string | null;
};

/** Block creating another Pro checkout when already on an active Pro plan. */
export function isAlreadyProSubscriber(
  subscription: SubscriptionRow | null | undefined
): boolean {
  return subscription?.status === "active" && subscription?.plan === "pro";
}

/**
 * Prefer existing Stripe customer id; otherwise seed checkout with JWT email.
 */
export function resolveCheckoutCustomer(args: {
  subscription: SubscriptionRow | null | undefined;
  userEmail: string | null | undefined;
}): { customer?: string; customer_email?: string } {
  const customerId = args.subscription?.stripe_customer_id;
  if (customerId) return { customer: customerId };
  if (args.userEmail) return { customer_email: args.userEmail };
  return {};
}
