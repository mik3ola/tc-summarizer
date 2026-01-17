// @ts-nocheck
// Supabase Edge Function: Stripe Webhook Handler
// Handles subscription events from Stripe
// JWT verification is DISABLED - uses Stripe signature verification instead
//
// NOTE: You may see "Deno.core.runMicrotasks() is not supported" errors in logs.
// This is a known Deno/Node.js compatibility issue with the Stripe SDK and occurs
// during event loop cleanup. It does NOT affect functionality - webhooks process
// successfully. This is a runtime-level issue that cannot be fully suppressed.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@13.10.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req: Request) => {
  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response("Missing stripe-signature header", { status: 400 });
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      // Use constructEventAsync for Deno/Supabase Edge Functions (sync crypto not supported)
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    console.log("Received Stripe event:", event.type);

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          await handleCheckoutCompleted(session);
          break;
        }

        case "customer.subscription.created": {
          // For created events, check if subscription already exists with Pro plan
          // (checkout.session.completed might have already set it)
          const subscription = event.data.object as Stripe.Subscription;
          const { data: existing } = await supabase
            .from("subscriptions")
            .select("plan, status")
            .eq("stripe_subscription_id", subscription.id)
            .maybeSingle();
          
          // Only update if subscription doesn't exist yet, or if it's not already Pro
          // This prevents overwriting Pro status set by checkout.session.completed
          if (!existing || (existing.plan !== "pro" && existing.status !== "active")) {
            await handleSubscriptionUpdate(subscription);
          } else {
            console.log(`Subscription ${subscription.id} already exists with plan=${existing.plan}, skipping created event`);
          }
          break;
        }
        
        case "customer.subscription.updated": {
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionUpdate(subscription);
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionDeleted(subscription);
          break;
        }

        case "invoice.paid": {
          const invoice = event.data.object as Stripe.Invoice;
          console.log("Invoice paid:", invoice.id);
          // Subscription status already handled by subscription.updated
          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          console.log("Invoice payment failed:", invoice.id);
          // Mark subscription as past_due
          if (invoice.subscription) {
            await updateSubscriptionStatus(
              invoice.subscription as string,
              "past_due"
            );
          }
          break;
        }

        default:
          console.log("Unhandled event type:", event.type);
      }

      // Return response immediately to avoid event loop issues
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("Error processing webhook:", err);
      return new Response(`Webhook handler error: ${err.message}`, {
        status: 500,
      });
    }
  } catch (err: any) {
    // Catch any uncaught errors, including Deno compatibility issues
    // Ignore runMicrotasks errors (known Deno/Node.js compatibility issue)
    if (err?.message?.includes("runMicrotasks")) {
      console.warn("Ignoring Deno microtasks compatibility warning (non-critical)");
      // Still return success since the webhook was processed
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.error("Uncaught error in webhook handler:", err);
    return new Response(`Internal error: ${err?.message || "Unknown error"}`, {
      status: 500,
    });
  }
});

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // Get the user_id from metadata (we'll set this when creating the checkout session)
  const userId = session.metadata?.user_id;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!userId) {
    console.error("No user_id in checkout session metadata");
    return;
  }

  console.log(
    `Checkout completed for user ${userId}, customer ${customerId}, subscription ${subscriptionId}`
  );

  // Update the user's subscription in Supabase
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "active",
      plan: "pro",
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    console.error("Error updating subscription:", error);
    throw error;
  }

  console.log(`User ${userId} upgraded to Pro`);
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const subscriptionId = subscription.id;
  const status = mapStripeStatus(subscription.status);
  
  // Safely handle current_period_end (may be null for some subscription states)
  let currentPeriodEnd: string | null = null;
  if (subscription.current_period_end && typeof subscription.current_period_end === 'number') {
    try {
      currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
    } catch (err) {
      console.warn(`Invalid current_period_end for subscription ${subscriptionId}:`, subscription.current_period_end);
    }
  }

  console.log(
    `Subscription ${subscriptionId} updated: status=${status}, ends=${currentPeriodEnd || 'N/A'}`
  );

  // Get existing subscription to preserve plan (don't overwrite plan unless canceling)
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

  const updateData: {
    status: string;
    plan?: string;
    current_period_end?: string | null;
    updated_at: string;
  } = {
    status,
    updated_at: new Date().toISOString(),
  };

  // CRITICAL: Never downgrade from Pro to free unless explicitly canceled
  // Preserve existing Pro/Enterprise plan unless status is explicitly canceled
  if (status === "canceled") {
    updateData.plan = "free";
  } else if (existing?.plan && (existing.plan === "pro" || existing.plan === "enterprise")) {
    // Always preserve Pro/Enterprise plan - never downgrade
    updateData.plan = existing.plan;
    // Also ensure status is active if plan is Pro and Stripe status is active/trialing
    if (subscription.status === "active" || subscription.status === "trialing") {
      updateData.status = "active";
    }
  } else if (status === "active" && !existing?.plan) {
    // New subscription with active status but no plan yet - checkout.session.completed will set it
    // Don't set plan here to avoid race conditions
  }

  if (currentPeriodEnd) {
    updateData.current_period_end = currentPeriodEnd;
  }

  const { error } = await supabase
    .from("subscriptions")
    .update(updateData)
    .eq("stripe_subscription_id", subscriptionId);

  if (error) {
    console.error("Error updating subscription:", error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const subscriptionId = subscription.id;

  console.log(`Subscription ${subscriptionId} deleted/canceled`);

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      plan: "free",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId);

  if (error) {
    console.error("Error updating subscription:", error);
    throw error;
  }
}

async function updateSubscriptionStatus(
  subscriptionId: string,
  status: "free" | "active" | "past_due" | "canceled"
) {
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId);

  if (error) {
    console.error("Error updating subscription status:", error);
    throw error;
  }
}

function mapStripeStatus(
  stripeStatus: string
): "free" | "active" | "past_due" | "canceled" {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    default:
      return "free";
  }
}

