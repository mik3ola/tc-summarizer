// Pure logic for send-welcome-email - testable without SMTP mocks

export function authorizeWelcomeRequest(
  authHeader: string | null,
  expectedSecret: string | undefined,
): { ok: true } | { ok: false; status: number; error: string } {
  if (!expectedSecret) {
    return { ok: false, status: 500, error: "Server misconfigured" };
  }
  const auth = authHeader || "";
  const provided = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
  if (provided !== expectedSecret) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  return { ok: true };
}

export function parseWelcomeEmailPayload(
  body: unknown,
): { ok: true; email: string; userId?: string } | { ok: false; status: number; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, status: 400, error: "Invalid JSON" };
  }
  const payload = body as { email?: string; user_id?: string };
  const email = (payload.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { ok: false, status: 400, error: "Missing or invalid email" };
  }
  return { ok: true, email, userId: payload.user_id };
}

export function resolveSiteUrl(envSiteUrl: string | undefined): string {
  return envSiteUrl && envSiteUrl.trim() ? envSiteUrl.trim() : "https://termsdigest.com";
}

export function buildWelcomeEmailHtml(siteUrl: string, year = new Date().getFullYear()): string {
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

export function buildWelcomeEmailText(siteUrl: string, year = new Date().getFullYear()): string {
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
    `© ${year} Screenx Ltd. All rights reserved.`,
  ].join("\n");
}
