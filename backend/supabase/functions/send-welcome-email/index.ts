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
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#070b16;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e5e7eb;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#070b16;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#0b1220;border:1px solid rgba(148,163,184,0.15);border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 8px 32px;">
                <div style="font-size:20px;font-weight:600;color:#ffffff;letter-spacing:-0.01em;">TermsDigest</div>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 0 32px;">
                <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.3;font-weight:600;color:#ffffff;letter-spacing:-0.02em;">
                  Welcome to TermsDigest
                </h1>
                <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#cbd5e1;">
                  Thanks for confirming your email. You're all set to start understanding the fine print behind every Terms & Conditions, Privacy Policy, and Refund Policy you come across.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px;">
                <div style="background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.2);border-radius:12px;padding:20px;">
                  <div style="font-size:14px;font-weight:600;color:#ffffff;margin-bottom:10px;">Getting started</div>
                  <ol style="margin:0;padding-left:20px;font-size:14px;line-height:1.7;color:#cbd5e1;">
                    <li>Open the TermsDigest icon in your Chrome toolbar to sign in</li>
                    <li>Browse any website normally</li>
                    <li>Hover over a Terms, Privacy, or Refund link to see an instant summary</li>
                  </ol>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 8px 32px;">
                <p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#cbd5e1;">
                  Free accounts include 5 AI summaries per month. Upgrade to Pro any time for 50 summaries plus the option to bring your own OpenAI key for unlimited use.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 32px 32px;">
                <a href="${siteUrl}" style="display:inline-block;background:linear-gradient(90deg,#3b82f6,#8b5cf6);color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:600;">
                  Visit TermsDigest
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px 32px;">
                <div style="border-top:1px solid rgba(148,163,184,0.15);padding-top:20px;font-size:12px;line-height:1.6;color:#94a3b8;">
                  Need help? Reply to nothing — this inbox isn't monitored. Instead, email
                  <a href="mailto:support@termsdigest.com" style="color:#60a5fa;text-decoration:none;">support@termsdigest.com</a>
                  or visit our
                  <a href="${siteUrl}/support" style="color:#60a5fa;text-decoration:none;">support page</a>.
                </div>
                <div style="padding-top:16px;font-size:11px;color:#64748b;">
                  © ${year} Screenx Ltd. All rights reserved.
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
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
