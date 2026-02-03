// @ts-nocheck
// Supabase Edge Function: POST /summarize
// JWT verification is DISABLED - we decode the token ourselves

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

type Summary = {
  title: string;
  tldr: string;
  costs_and_renewal: string[];
  cancellation_and_refunds: string[];
  liability_and_disputes: string[];
  privacy_and_data: string[];
  red_flags: string[];
  quotes: { quote: string; why_it_matters: string }[];
  confidence: "low" | "medium" | "high";
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders }
  });
}

function monthStart(d = new Date()) {
  const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  return dt.toISOString().slice(0, 10);
}

function getMonthlyQuota(plan: string) {
  if (plan === "pro") return 50;
  if (plan === "enterprise") return 5000;
  return 5; // free tier
}

function decodeJwtPayload(token: string): { sub: string; role: string } | null {
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

function buildPrompt(url: string, text: string) {
  return {
    system: "You summarize website legal pages (terms, privacy, refund, billing). Be concise, cautious, and highlight potentially costly clauses. If unsure, say so.",
    user: `Summarize this page for a normal user.

Requirements:
- Output STRICT JSON only (no markdown, no extra text).
- Be factual; do not invent clauses.
- Focus on costs/renewals, cancellation/refunds/returns/exchanges, liability, arbitration/jurisdiction, data sharing/ads, auto-renew, trials, termination, and unusual restrictions.
- Include a short list of quotes to support the biggest risks.

Return JSON with this schema:
{
  "title": string,
  "tldr": string,
  "costs_and_renewal": string[],
  "cancellation_and_refunds": string[],
  "liability_and_disputes": string[],
  "privacy_and_data": string[],
  "red_flags": string[],
  "quotes": { "quote": string, "why_it_matters": string }[],
  "confidence": "low"|"medium"|"high"
}

Page URL: ${url}
Page text:
${text}
`
  };
}

async function callOpenAI(url: string, text: string): Promise<Summary> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");
  
  const model = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";
  const prompt = buildPrompt(url, text);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      service_tier: "priority", // Enable Priority Processing for faster, lower-latency responses
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user }
      ]
    })
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`OpenAI error (${res.status}): ${t.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  const serviceTierUsed = data?.service_tier || "unknown";
  console.log(`OpenAI service_tier used: ${serviceTierUsed}`);
  
  if (!content) throw new Error("Empty OpenAI response");
  
  return JSON.parse(content) as Summary;
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "Server configuration error" }, 500);
    }

    // Get and decode JWT from authorization header
    const authHeader = req.headers.get("authorization") || "";
    let userId: string | null = null;
    
    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const payload = decodeJwtPayload(token);
      if (payload?.sub) {
        userId = payload.sub;
      }
    }

    // Anonymous users are NOT allowed - must be authenticated
    if (!userId) {
      console.log("Anonymous request blocked");
      return json({ error: "Authentication required. Please sign in to use this service." }, 401);
    }

    console.log("User ID:", userId);

    // Parse request body
    const body = await req.json().catch(() => null);
    const url = typeof body?.url === "string" ? body.url : "";
    const text = typeof body?.text === "string" ? body.text : "";
    
    if (!url || !text) {
      return json({ error: "Missing url or text" }, 400);
    }

    // Create Supabase client for DB operations
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Check quota for the authenticated user
    {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("status, plan")
        .eq("user_id", userId)
        .maybeSingle();

      const plan = sub?.plan || "free";
      const m = monthStart();
      
      const { data: counter } = await supabase
        .from("usage_counters_monthly")
        .select("summaries_count")
        .eq("user_id", userId)
        .eq("month_start", m)
        .maybeSingle();

      const used = counter?.summaries_count || 0;
      const quota = getMonthlyQuota(plan);
      
      if (used >= quota) {
        return json({ 
          error: "Quota exceeded",
          quotaExceeded: true,
          used,
          quota,
          plan,
          message: plan === "free" 
            ? "You've used all 5 free summaries this month. Upgrade to Pro for 50 summaries/month!"
            : "You've reached your monthly limit. Contact us to upgrade your plan."
        }, 429);
      }
    }

    // Call OpenAI with Priority Processing
    console.log("Calling OpenAI (priority tier) for URL:", url.slice(0, 100));
    const startTime = Date.now();
    const summary = await callOpenAI(url, text);
    const latencyMs = Date.now() - startTime;
    console.log(`OpenAI response received in ${latencyMs}ms, confidence: ${summary.confidence}`);

    // Return the summary first, then try to log usage
    const response = json({ summary });

    // Try to record usage (non-blocking)
    if (userId) {
      try {
        const m = monthStart();
        
        // Log usage event
        const { error: insertError } = await supabase.from("usage_events").insert({
          user_id: userId,
          url,
          input_chars: text.length,
          model: Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini",
          cached: false
        });
        if (insertError) console.error("Usage event error:", insertError.message);
        else console.log("Usage event logged");

        // Update monthly counter
        const { data: existing, error: selectError } = await supabase
          .from("usage_counters_monthly")
          .select("summaries_count")
          .eq("user_id", userId)
          .eq("month_start", m)
          .maybeSingle();
        
        if (selectError) {
          console.error("Counter select error:", selectError.message);
        } else if (existing) {
          const { error: updateError } = await supabase
            .from("usage_counters_monthly")
            .update({ summaries_count: (existing.summaries_count || 0) + 1 })
            .eq("user_id", userId)
            .eq("month_start", m);
          if (updateError) console.error("Counter update error:", updateError.message);
          else console.log("Counter updated to:", (existing.summaries_count || 0) + 1);
        } else {
          const { error: createError } = await supabase.from("usage_counters_monthly").insert({
            user_id: userId,
            month_start: m,
            summaries_count: 1
          });
          if (createError) console.error("Counter create error:", createError.message);
          else console.log("Counter created");
        }
      } catch (e) {
        console.error("Usage tracking error:", e);
      }
    }

    return response;
    
  } catch (e) {
    console.error("Error:", e);
    return json({ error: e?.message || String(e) }, 500);
  }
});