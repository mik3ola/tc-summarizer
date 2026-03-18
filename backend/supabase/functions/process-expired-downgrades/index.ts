// @ts-nocheck
// Supabase Edge Function: Process Expired Downgrades (Cron)
// Runs daily to downgrade subscriptions where downgrade_scheduled_for has passed.
// Secured by CRON_SECRET - call with: Authorization: Bearer <CRON_SECRET>

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@13.10.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const cronSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("authorization") || "";
  const providedSecret = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!cronSecret || providedSecret !== cronSecret) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const now = new Date().toISOString();

    const { data: subs, error } = await supabase
      .from("subscriptions")
      .select("user_id, status, plan, stripe_subscription_id")
      .eq("status", "active")
      .eq("auto_renew", false)
      .not("downgrade_scheduled_for", "is", null)
      .lte("downgrade_scheduled_for", now);

    if (error) {
      console.error("Query error:", error);
      return json({ error: "Failed to query subscriptions" }, 500);
    }

    const processed = [];
    const errors = [];

    for (const sub of subs || []) {
      try {
        if (stripeSecretKey && sub.stripe_subscription_id) {
          try {
            const stripe = new Stripe(stripeSecretKey, {
              apiVersion: "2023-10-16",
              httpClient: Stripe.createFetchHttpClient(),
            });
            await stripe.subscriptions.cancel(sub.stripe_subscription_id);
          } catch (stripeErr) {
            console.warn("Stripe cancel (may already be canceled):", stripeErr);
          }
        }

        const { error: updateErr } = await supabase
          .from("subscriptions")
          .update({
            status: "canceled",
            plan: "free",
            auto_renew: false,
            downgrade_scheduled_for: null,
            downgrade_reason: "expired",
            stripe_subscription_id: null,
            current_period_end: null,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", sub.user_id);

        if (updateErr) throw updateErr;

        // Reset the billing cycle anchor to today so the user begins a fresh
        // free 30-day period with 0 usage rather than inheriting the tail
        // of their last Pro period (which could already be > the free limit of 5).
        await supabase
          .from("profiles")
          .update({ cycle_anchor_date: new Date().toISOString().slice(0, 10) })
          .eq("user_id", sub.user_id);

        await supabase.from("subscription_changes").insert({
          user_id: sub.user_id,
          action: "downgrade_now",
          reason: "expired",
          previous_status: sub.status,
          previous_plan: sub.plan,
          new_status: "canceled",
          new_plan: "free",
        });

        processed.push(sub.user_id);
      } catch (e) {
        console.error("Error processing user", sub.user_id, e);
        errors.push({ user_id: sub.user_id, error: (e as Error).message });
      }
    }

    if (errors.length > 0) {
      console.error("Downgrade errors:", JSON.stringify(errors));
    }

    return json({
      success: true,
      processed: processed.length,
      errors: errors.length,
    });
  } catch (err) {
    console.error("Cron error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
