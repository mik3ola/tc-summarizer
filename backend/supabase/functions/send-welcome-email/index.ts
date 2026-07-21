// @ts-nocheck
// Supabase Edge Function: Send welcome email on email confirmation
//
// Triggered by a Postgres trigger on auth.users that calls this function via
// pg_net whenever email_confirmed_at transitions from NULL -> timestamp.
//
// The welcome email is sent from no-reply@termsdigest.com via Hostinger SMTP
// and BCC'd to the Trustpilot AFS address so Trustpilot can auto-invite the
// user to leave a review a few days later.
//
// Required environment variables (set via Supabase Dashboard -> Edge Functions
// -> Secrets, OR via `supabase secrets set ...`):
//   SMTP_HOST             e.g. smtp.hostinger.com
//   SMTP_PORT             e.g. 465
//   SMTP_USERNAME         e.g. admin@termsdigest.com (the real mailbox)
//   SMTP_PASSWORD         the mailbox password
//   SMTP_FROM_EMAIL       no-reply@termsdigest.com (alias used in From header)
//   SMTP_FROM_NAME        "TermsDigest" (display name)
//   TRUSTPILOT_AFS_BCC    termsdigest.com+xxxxxx@invite.trustpilot.com
//   WELCOME_EMAIL_SECRET  a random shared secret — Postgres trigger sends this
//                         in an Authorization header so only our trigger can
//                         invoke this function.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import {
  authorizeWelcomeRequest,
  parseWelcomeEmailPayload,
  resolveSiteUrl,
  buildWelcomeEmailHtml,
  buildWelcomeEmailText,
} from "./lib.ts";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // --- Auth: simple shared secret so only our Postgres trigger can call us ---
  const authResult = authorizeWelcomeRequest(
    req.headers.get("authorization"),
    Deno.env.get("WELCOME_EMAIL_SECRET"),
  );
  if (!authResult.ok) {
    if (authResult.status === 500) {
      console.error("[send-welcome-email] WELCOME_EMAIL_SECRET is not set");
    }
    return json({ error: authResult.error }, authResult.status);
  }

  // --- Parse payload from the trigger ---
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const parsed = parseWelcomeEmailPayload(body);
  if (!parsed.ok) {
    return json({ error: parsed.error }, parsed.status);
  }
  const { email } = parsed;

  // --- SMTP config ---
  const host = Deno.env.get("SMTP_HOST");
  const port = Number(Deno.env.get("SMTP_PORT") || "465");
  const username = Deno.env.get("SMTP_USERNAME");
  const password = Deno.env.get("SMTP_PASSWORD");
  const fromEmail = Deno.env.get("SMTP_FROM_EMAIL") || "no-reply@termsdigest.com";
  const fromName = Deno.env.get("SMTP_FROM_NAME") || "TermsDigest";
  const bcc = Deno.env.get("TRUSTPILOT_AFS_BCC") || "";
  const siteUrl = resolveSiteUrl(Deno.env.get("SITE_URL"));

  if (!host || !username || !password) {
    console.error("[send-welcome-email] Missing SMTP config");
    return json({ error: "Server misconfigured (SMTP)" }, 500);
  }

  const client = new SMTPClient({
    connection: {
      hostname: host,
      port,
      tls: true, // Hostinger SMTP on 465 is implicit TLS
      auth: { username, password },
    },
  });

  try {
    await client.send({
      from: `${fromName} <${fromEmail}>`,
      to: email,
      bcc: bcc ? [bcc] : undefined,
      subject: "Welcome to TermsDigest",
      content: buildWelcomeEmailText(siteUrl),
      html: buildWelcomeEmailHtml(siteUrl),
    });
    await client.close();
    console.log(`[send-welcome-email] Sent welcome email to ${email}`);
    return json({ ok: true });
  } catch (e) {
    try { await client.close(); } catch (_) { /* noop */ }
    console.error("[send-welcome-email] SMTP send failed:", e);
    return json({ error: "Failed to send email", detail: String(e?.message || e) }, 500);
  }
});
