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
import { mapStripeStatus, buildSubscriptionUpdateData, shouldSkipCreatedEvent } from "./lib.ts";

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
          const subscription = event.data.object as Stripe.Subscription;
          const { data: existing } = await supabase
            .from("subscriptions")
            .select("plan, status")
            .eq("stripe_subscription_id", subscription.id)
            .maybeSingle();

          if (shouldSkipCreatedEvent(existing)) {
            console.log(`Subscription ${subscription.id} already exists with plan=${existing!.plan}, skipping created event`);
          } else {
            await handleSubscriptionUpdate(subscription);
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

  const upgradeDate = new Date().toISOString().slice(0, 10);

  // Update the user's subscription in Supabase
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "active",
      plan: "pro",
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      auto_renew: true,
      downgrade_scheduled_for: null,
      downgrade_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    console.error("Error updating subscription:", error);
    throw error;
  }

  // Reset the quota cycle anchor to the upgrade date so the user's 30-day
  // billing period starts fresh from the moment they paid.
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ cycle_anchor_date: upgradeDate })
    .eq("user_id", userId);

  if (profileError) {
    console.error("Error updating cycle_anchor_date:", profileError);
    // Non-fatal — log and continue
  }

  console.log(`User ${userId} upgraded to Pro, cycle anchor set to ${upgradeDate}`);
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const subscriptionId = subscription.id;

  let currentPeriodEnd: string | null = null;
  if (subscription.current_period_end && typeof subscription.current_period_end === "number") {
    try {
      currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
    } catch (err) {
      console.warn(`Invalid current_period_end for subscription ${subscriptionId}:`, subscription.current_period_end);
    }
  }

  const { data: existing } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

  const updateData = buildSubscriptionUpdateData(
    subscription.status,
    subscription.cancel_at_period_end,
    currentPeriodEnd,
    existing,
    new Date().toISOString(),
  );

  console.log(`Subscription ${subscriptionId} updated: status=${updateData.status}, ends=${currentPeriodEnd || "N/A"}`);

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
      auto_renew: false,
      downgrade_scheduled_for: null,
      downgrade_reason: null,
      stripe_subscription_id: null,
      current_period_end: null,
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


