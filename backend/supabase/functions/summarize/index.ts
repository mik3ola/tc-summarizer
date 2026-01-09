// Supabase Edge Function: POST /summarize
// - Verifies Supabase JWT (user)
// - Enforces subscription + quota + rate limits (MVP scaffolding)
// - Calls OpenAI with server-side API key
//
// This is a scaffold: you'll need to finish quota rules + Stripe integration.

import { createClient } from "jsr:@supabase/supabase-js@2";

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
    headers: { "content-type": "application/json" }
  });
}

function requireEnv(name: string) {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function monthStart(d = new Date()) {
  const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  return dt.toISOString().slice(0, 10); // YYYY-MM-DD
}

function getMonthlyQuota(plan: string) {
  // v1 pricing:
  // - free: 5/month
  // - pro: 50/month
  // - enterprise: custom (env)
  if (plan === "pro") return Number(Deno.env.get("PRO_MONTHLY_QUOTA") || "50");
  if (plan === "enterprise") return Number(Deno.env.get("ENTERPRISE_MONTHLY_QUOTA") || "5000");
  return Number(Deno.env.get("FREE_MONTHLY_QUOTA") || "5");
}

function buildPrompt(url: string, text: string) {
  return {
    system:
      "You summarize website legal pages (terms, privacy, refund, billing). Be concise, cautious, and highlight potentially costly clauses. If unsure, say so.",
    user: `Summarize this page for a normal user.

Requirements:
- Output STRICT JSON only (no markdown, no extra text).
- Be factual; do not invent clauses.
- Focus on costs/renewals, cancellation/refunds, liability, arbitration/jurisdiction, data sharing/ads, auto-renew, trials, termination, and unusual restrictions.
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
  const apiKey = requireEnv("OPENAI_API_KEY");
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
  if (!content) throw new Error("Empty OpenAI response.");
  return JSON.parse(content) as Summary;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    // Supabase client (service role recommended for server-side writes; JWT is used to identify user)
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const anonKey = requireEnv("SUPABASE_ANON_KEY");
    const authHeader = req.headers.get("authorization") || "";

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => null);
    const url = typeof body?.url === "string" ? body.url : "";
    const text = typeof body?.text === "string" ? body.text : "";
    if (!url || !text) return json({ error: "Missing url or text" }, 400);

    // Subscription status check (MVP)
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("status, plan")
      .eq("user_id", userId)
      .maybeSingle();

    const status = sub?.status || "free";
    const plan = sub?.plan || "free";
    // Allow free tier usage via backend up to free quota.
    // Pro users should have status 'active' + plan 'pro'.
    if (plan === "pro" && status !== "active") return json({ error: "Subscription required" }, 402);

    // Quota check (MVP)
    const m = monthStart();
    const { data: counter } = await supabase
      .from("usage_counters_monthly")
      .select("summaries_count")
      .eq("user_id", userId)
      .eq("month_start", m)
      .maybeSingle();

    const used = counter?.summaries_count || 0;
    const quota = getMonthlyQuota(plan);
    if (used >= quota) return json({ error: "Quota exceeded" }, 429);

    const summary = await callOpenAI(url, text);

    // Record usage
    await supabase.from("usage_events").insert({
      user_id: userId,
      url,
      url_hash: null,
      input_chars: text.length,
      model: Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini",
      cached: false
    });

    // Increment monthly counter
    if (!counter) {
      await supabase.from("usage_counters_monthly").insert({
        user_id: userId,
        month_start: m,
        summaries_count: 1
      });
    } else {
      await supabase
        .from("usage_counters_monthly")
        .update({ summaries_count: used + 1 })
        .eq("user_id", userId)
        .eq("month_start", m);
    }

    return json({ summary });
  } catch (e) {
    return json({ error: e?.message || String(e) }, 500);
  }
});


