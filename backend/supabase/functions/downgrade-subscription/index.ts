// @ts-nocheck
// Supabase Edge Function: Downgrade Subscription
// Handles cancel_auto_renew and downgrade_now actions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@13.10.0?target=deno";
import {
  extractUserId,
  validateRequestBody,
  resolveDowngradeAction,
  type Action,
  type Reason,
} from "./lib.ts";

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

  try {
    const userId = extractUserId(req.headers.get("authorization"));

    if (!userId) {
      return json({ error: "Authentication required" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    let action: string;
    let reason: string;
    try {
      const validated = validateRequestBody(body);
      action = validated.action;
      reason = validated.reason;
    } catch (e) {
      return json({ error: (e as Error).message }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const stripe = stripeSecretKey
      ? new Stripe(stripeSecretKey, {
          apiVersion: "2023-10-16",
          httpClient: Stripe.createFetchHttpClient(),
        })
      : null;

    const { data: sub, error: subError } = await supabase
      .from("subscriptions")
      .select("user_id, status, plan, stripe_subscription_id, current_period_end, auto_renew, downgrade_scheduled_for")
      .eq("user_id", userId)
      .maybeSingle();

    if (subError) {
      console.error("Subscription lookup error:", subError);
      return json({ error: "Failed to load subscription" }, 500);
    }

    if (!sub) {
      return json({ error: "No subscription found" }, 404);
    }

    const outcome = resolveDowngradeAction(
      action as Action,
      sub,
      reason as Reason
    );

    if (outcome.kind === "reject_unpaid") {
      return json({ error: "No active paid subscription to downgrade" }, 400);
    }

    if (outcome.kind === "cancel_noop" || outcome.kind === "reenable_noop") {
      return json({
        success: true,
        subscription: outcome.subscription,
      });
    }

    // Stripe side-effects (unchanged policies; failures are logged, not fatal)
    if (outcome.kind === "cancel_schedule") {
      if (stripe && sub.stripe_subscription_id) {
        try {
          await stripe.subscriptions.update(sub.stripe_subscription_id, {
            cancel_at_period_end: true,
          });
        } catch (stripeErr) {
          console.error("Stripe cancel_at_period_end error:", stripeErr);
        }
      }
    } else if (outcome.kind === "reenable") {
      if (stripe && sub.stripe_subscription_id) {
        try {
          await stripe.subscriptions.update(sub.stripe_subscription_id, {
            cancel_at_period_end: false,
          });
        } catch (stripeErr) {
          console.error("Stripe re-enable error:", stripeErr);
        }
      }
    } else if (
      outcome.kind === "downgrade_schedule" ||
      outcome.kind === "downgrade_immediate"
    ) {
      if (stripe && sub.stripe_subscription_id) {
        try {
          await stripe.subscriptions.cancel(sub.stripe_subscription_id);
        } catch (stripeErr) {
          console.error("Stripe cancel error:", stripeErr);
        }
      }
      // If the user has remaining paid time, also mark cancel_at_period_end
      // (historical behavior preserved for schedule path).
      if (outcome.kind === "downgrade_schedule" && stripe && sub.stripe_subscription_id) {
        try {
          await stripe.subscriptions.update(sub.stripe_subscription_id, {
            cancel_at_period_end: true,
          });
        } catch (stripeErr) {
          console.error("Stripe cancel_at_period_end error:", stripeErr);
        }
      }
    }

    const updateErrorLabel =
      outcome.kind === "downgrade_schedule" || outcome.kind === "downgrade_immediate"
        ? "Failed to downgrade subscription"
        : "Failed to update subscription";

    const { error: updateErr } = await supabase
      .from("subscriptions")
      .update(outcome.dbUpdate)
      .eq("user_id", userId);

    if (updateErr) {
      console.error("DB update error:", updateErr);
      return json({ error: updateErrorLabel }, 500);
    }

    const { changeLog } = outcome;
    await logChange(
      supabase,
      userId,
      changeLog.action,
      changeLog.reason,
      changeLog.previous_status,
      changeLog.previous_plan,
      changeLog.new_status,
      changeLog.new_plan
    );

    return json({
      success: true,
      subscription: outcome.subscription,
    });
  } catch (err) {
    console.error("Downgrade error:", err);
    return json({ error: err?.message || "Internal server error" }, 500);
  }
});

async function logChange(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  action: string,
  reason: string,
  prevStatus: string,
  prevPlan: string,
  newStatus: string,
  newPlan: string
) {
  try {
    await supabase.from("subscription_changes").insert({
      user_id: userId,
      action,
      reason,
      previous_status: prevStatus,
      previous_plan: prevPlan,
      new_status: newStatus,
      new_plan: newPlan,
    });
  } catch (e) {
    console.warn("Failed to log subscription change:", e);
  }
}
