// Pure SMTP send-option helpers for welcome email.
// Distinct from send-welcome-email/lib.ts in parallel coverage PR #18
// (auth secret, payload parse, site URL, HTML/text bodies).
// This module locks Trustpilot AFS BCC optionality and From-header defaults.

export const DEFAULT_SMTP_FROM_EMAIL = "no-reply@termsdigest.com";
export const DEFAULT_SMTP_FROM_NAME = "TermsDigest";
export const WELCOME_EMAIL_SUBJECT = "Welcome to TermsDigest";

/**
 * Trustpilot AFS expects BCC only when configured.
 * Empty / whitespace must become `undefined` (not `[""]`) so denomailer
 * omits the header instead of sending a broken recipient.
 */
export function resolveTrustpilotBcc(
  bccEnv: string | undefined | null,
): string[] | undefined {
  const trimmed = String(bccEnv ?? "").trim();
  return trimmed ? [trimmed] : undefined;
}

export type SmtpIdentity = {
  fromEmail: string;
  fromName: string;
  fromHeader: string;
};

/** Resolve From display name + mailbox used in the SMTP envelope. */
export function resolveSmtpIdentity(args: {
  fromEmail?: string | null;
  fromName?: string | null;
} = {}): SmtpIdentity {
  const fromEmail = args.fromEmail || DEFAULT_SMTP_FROM_EMAIL;
  const fromName = args.fromName || DEFAULT_SMTP_FROM_NAME;
  return {
    fromEmail,
    fromName,
    fromHeader: `${fromName} <${fromEmail}>`,
  };
}

export type WelcomeMailSendOptions = {
  from: string;
  to: string;
  bcc: string[] | undefined;
  subject: string;
};

/**
 * Build denomailer `client.send` identity fields (from/to/bcc/subject).
 * Content/html stay at the call site (owned by #18 body builders).
 */
export function buildWelcomeMailSendOptions(args: {
  email: string;
  fromEmail?: string | null;
  fromName?: string | null;
  bccEnv?: string | null;
}): WelcomeMailSendOptions {
  const identity = resolveSmtpIdentity({
    fromEmail: args.fromEmail,
    fromName: args.fromName,
  });
  return {
    from: identity.fromHeader,
    to: args.email,
    bcc: resolveTrustpilotBcc(args.bccEnv),
    subject: WELCOME_EMAIL_SUBJECT,
  };
}

/** True when required SMTP connection secrets are present. */
export function hasRequiredSmtpConfig(args: {
  host?: string | null;
  username?: string | null;
  password?: string | null;
}): boolean {
  return !!(args.host && args.username && args.password);
}
