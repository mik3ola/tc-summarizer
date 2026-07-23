// @ts-nocheck
// Supabase Edge Function: Delete User Account
// Schedules account deletion in 30 days. Cron job performs hard delete.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@13.10.0?target=deno";
import {
  computeDeletionScheduledFor,
  existingDeletionSchedule,
  extractUserId,
  isValidDeleteConfirmation,
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
    if (!isValidDeleteConfirmation(body?.confirmation)) {
      return json({ error: "Confirmation must be exactly 'DELETE'" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, deletion_scheduled_for")
      .eq("user_id", userId)
      .maybeSingle();

    if (!profile) {
      return json({ error: "Profile not found" }, 404);
    }

    const alreadyScheduled = existingDeletionSchedule(profile);
    if (alreadyScheduled) {
      return json({
        success: true,
        deletion_scheduled_for: alreadyScheduled,
        message: "Deletion already scheduled",
      });
    }

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (stripeSecretKey && sub?.stripe_subscription_id) {
      try {
        const stripe = new Stripe(stripeSecretKey, {
          apiVersion: "2023-10-16",
          httpClient: Stripe.createFetchHttpClient(),
        });
        await stripe.subscriptions.cancel(sub.stripe_subscription_id);
      } catch (e) {
        console.warn("Stripe cancel error:", e);
      }
    }

    const scheduledForIso = computeDeletionScheduledFor(new Date());

    const { error } = await supabase
      .from("profiles")
      .update({ deletion_scheduled_for: scheduledForIso })
      .eq("user_id", userId);

    if (error) {
      console.error("Profile update error:", error);
      return json({ error: "Failed to schedule deletion" }, 500);
    }

    return json({
      success: true,
      deletion_scheduled_for: scheduledForIso,
      message: "Account will be permanently deleted in 30 days",
    });
  } catch (err) {
    console.error("Delete account error:", err);
    return json({ error: (err as Error).message || "Internal server error" }, 500);
  }
});
