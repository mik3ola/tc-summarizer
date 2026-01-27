// @ts-nocheck
// Supabase Edge Function: Create Stripe Checkout Session
// JWT verification is DISABLED - we decode the token ourselves

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@13.10.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders }
  });
}

function decodeJwtPayload(token: string): { sub: string; email?: string } | null {
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

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const priceId = Deno.env.get("STRIPE_PRICE_ID");
    const siteUrl = Deno.env.get("SITE_URL") || "https://termsdigest.com";

    if (!stripeSecretKey || !supabaseUrl || !serviceRoleKey || !priceId) {
      console.error("Missing config:", { stripeSecretKey: !!stripeSecretKey, supabaseUrl: !!supabaseUrl, serviceRoleKey: !!serviceRoleKey, priceId: !!priceId });
      return json({ error: "Server configuration error" }, 500);
    }

    // Decode JWT from authorization header
    const authHeader = req.headers.get("authorization") || "";
    let userId: string | null = null;
    let userEmail: string | null = null;

    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const payload = decodeJwtPayload(token);
      if (payload?.sub) {
        userId = payload.sub;
        userEmail = payload.email || null;
      }
    }

    console.log("User ID:", userId);

    if (!userId) {
      return json({ error: "Authentication required" }, 401);
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Create Supabase client with service role for DB operations
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Check if user already has an active subscription
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("status, plan, stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (subError) {
      console.error("Subscription lookup error:", subError.message);
    }

    if (subscription?.status === "active" && subscription?.plan === "pro") {
      return json({ error: "Already subscribed to Pro" }, 400);
    }

    console.log("Creating checkout session for user:", userId);

    // Create Stripe checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/pricing`,
      metadata: {
        user_id: userId,
      },
    };

    // Use existing Stripe customer or email
    if (subscription?.stripe_customer_id) {
      sessionParams.customer = subscription.stripe_customer_id;
    } else if (userEmail) {
      sessionParams.customer_email = userEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    console.log("Checkout session created:", session.id);

    return json({ url: session.url });

  } catch (err) {
    console.error("Error creating checkout session:", err);
    return json({ error: err?.message || "Failed to create checkout session" }, 500);
  }
});
