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

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function buildWelcomeEmailHtml(siteUrl: string): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>Welcome to TermsDigest</title></head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

        <!-- Logo -->
        <tr><td align="center" style="padding-bottom:32px;">
          <table cellpadding="0" cellspacing="0" align="center"><tr>
            <td style="vertical-align:middle;padding-right:10px;">
              <img src="${siteUrl}/logo.png" alt="TermsDigest" width="36" height="36" style="display:block;border-radius:8px;" />
            </td>
            <td style="vertical-align:middle;">
              <span style="font-size:20px;font-weight:700;color:#e2e8f0;">TermsDigest</span>
            </td>
          </tr></table>
        </td></tr>

        <!-- Card -->
        <tr><td style="background-color:#1e293b;border:1px solid rgba(148,163,184,0.15);border-radius:16px;padding:40px 36px;">
          <table width="100%" cellpadding="0" cellspacing="0">

            <tr><td align="center" style="padding-bottom:24px;">
              <span style="font-size:40px;">👋</span>
            </td></tr>

            <tr><td align="center" style="padding-bottom:12px;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#f1f5f9;">Welcome to TermsDigest</h1>
            </td></tr>

            <tr><td align="center" style="padding-bottom:28px;">
              <p style="margin:0;font-size:15px;color:#94a3b8;line-height:1.6;">
                Your email is confirmed and your account is ready. Start understanding the fine print behind every Terms &amp; Conditions, Privacy Policy, and Refund Policy you come across.
              </p>
            </td></tr>

            <tr><td align="center" style="padding-bottom:24px;">
              <a href="${siteUrl}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:8px;">
                Visit TermsDigest →
              </a>
            </td></tr>

            <tr><td style="padding-bottom:24px;"><div style="height:1px;background:rgba(148,163,184,0.15);"></div></td></tr>

            <tr><td style="padding-bottom:8px;">
              <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#e2e8f0;">Getting started</p>
              <p style="margin:0 0 6px;font-size:13px;color:#94a3b8;line-height:1.7;">
                1. Click the TermsDigest icon in your Chrome toolbar to sign in.
              </p>
              <p style="margin:0 0 6px;font-size:13px;color:#94a3b8;line-height:1.7;">
                2. Browse any website normally.
              </p>
              <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.7;">
                3. Hover over a Terms, Privacy, or Refund link for an instant summary.
              </p>
            </td></tr>

          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td align="center" style="padding-top:28px;">
          <p style="margin:0 0 6px;font-size:12px;color:#475569;">Free accounts include 5 summaries per month. Upgrade to Pro any time for 50 summaries — or bring your own OpenAI key for unlimited use.</p>
          <p style="margin:0;font-size:11px;color:#334155;">© ${year} TermsDigest · <a href="${siteUrl}/support" style="color:#3b82f6;text-decoration:none;">Support</a></p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildWelcomeEmailText(siteUrl: string): string {
  return [
    "Welcome to TermsDigest",
    "",
    "Thanks for confirming your email. You're all set to start understanding",
    "the fine print behind every Terms & Conditions, Privacy Policy, and",
    "Refund Policy you come across.",
    "",
    "Getting started:",
    "  1. Open the TermsDigest icon in your Chrome toolbar to sign in",
    "  2. Browse any website normally",
    "  3. Hover over a Terms, Privacy, or Refund link for an instant summary",
    "",
    "Free accounts include 5 AI summaries per month. Upgrade to Pro any time",
    "for 50 summaries plus the option to bring your own OpenAI key.",
    "",
    `Visit TermsDigest: ${siteUrl}`,
    "",
    "Need help? Email support@termsdigest.com",
    `Support page: ${siteUrl}/support`,
    "",
    `© ${new Date().getFullYear()} Screenx Ltd. All rights reserved.`,
  ].join("\n");
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // --- Auth: simple shared secret so only our Postgres trigger can call us ---
  const expectedSecret = Deno.env.get("WELCOME_EMAIL_SECRET");
  if (!expectedSecret) {
    console.error("[send-welcome-email] WELCOME_EMAIL_SECRET is not set");
    return json({ error: "Server misconfigured" }, 500);
  }
  const auth = req.headers.get("authorization") || "";
  const provided = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
  if (provided !== expectedSecret) {
    return json({ error: "Unauthorized" }, 401);
  }

  // --- Parse payload from the trigger ---
  let payload: { email?: string; user_id?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const email = (payload.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return json({ error: "Missing or invalid email" }, 400);
  }

  // --- SMTP config ---
  const host = Deno.env.get("SMTP_HOST");
  const port = Number(Deno.env.get("SMTP_PORT") || "465");
  const username = Deno.env.get("SMTP_USERNAME");
  const password = Deno.env.get("SMTP_PASSWORD");
  const fromEmail = Deno.env.get("SMTP_FROM_EMAIL") || "no-reply@termsdigest.com";
  const fromName = Deno.env.get("SMTP_FROM_NAME") || "TermsDigest";
  const bcc = Deno.env.get("TRUSTPILOT_AFS_BCC") || "";
  const siteUrl = Deno.env.get("SITE_URL") || "https://termsdigest.com";

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
