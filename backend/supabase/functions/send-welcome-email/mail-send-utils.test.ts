import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  DEFAULT_SMTP_FROM_EMAIL,
  DEFAULT_SMTP_FROM_NAME,
  WELCOME_EMAIL_SUBJECT,
  buildWelcomeMailSendOptions,
  hasRequiredSmtpConfig,
  resolveSmtpIdentity,
  resolveTrustpilotBcc,
} from "./mail-send-utils.ts";

Deno.test("resolveTrustpilotBcc - returns undefined when unset/blank", () => {
  assertEquals(resolveTrustpilotBcc(undefined), undefined);
  assertEquals(resolveTrustpilotBcc(null), undefined);
  assertEquals(resolveTrustpilotBcc(""), undefined);
  assertEquals(resolveTrustpilotBcc("   "), undefined);
});

Deno.test("resolveTrustpilotBcc - wraps trimmed address in a one-item array", () => {
  assertEquals(resolveTrustpilotBcc("afs@invite.trustpilot.com"), [
    "afs@invite.trustpilot.com",
  ]);
  assertEquals(resolveTrustpilotBcc("  afs@invite.trustpilot.com  "), [
    "afs@invite.trustpilot.com",
  ]);
});

Deno.test("resolveSmtpIdentity - defaults From mailbox and display name", () => {
  assertEquals(resolveSmtpIdentity({}), {
    fromEmail: DEFAULT_SMTP_FROM_EMAIL,
    fromName: DEFAULT_SMTP_FROM_NAME,
    fromHeader: `${DEFAULT_SMTP_FROM_NAME} <${DEFAULT_SMTP_FROM_EMAIL}>`,
  });
});

Deno.test("resolveSmtpIdentity - uses provided From fields", () => {
  assertEquals(
    resolveSmtpIdentity({
      fromEmail: "hello@termsdigest.com",
      fromName: "TD",
    }),
    {
      fromEmail: "hello@termsdigest.com",
      fromName: "TD",
      fromHeader: "TD <hello@termsdigest.com>",
    },
  );
});

Deno.test("buildWelcomeMailSendOptions - includes Trustpilot BCC when configured", () => {
  const opts = buildWelcomeMailSendOptions({
    email: "user@example.com",
    bccEnv: "termsdigest.com+x@invite.trustpilot.com",
  });
  assertEquals(opts, {
    from: `${DEFAULT_SMTP_FROM_NAME} <${DEFAULT_SMTP_FROM_EMAIL}>`,
    to: "user@example.com",
    bcc: ["termsdigest.com+x@invite.trustpilot.com"],
    subject: WELCOME_EMAIL_SUBJECT,
  });
});

Deno.test("buildWelcomeMailSendOptions - omits BCC when AFS secret unset", () => {
  const opts = buildWelcomeMailSendOptions({
    email: "user@example.com",
    fromEmail: "custom@termsdigest.com",
    fromName: "Custom",
    bccEnv: "",
  });
  assertEquals(opts.from, "Custom <custom@termsdigest.com>");
  assertEquals(opts.bcc, undefined);
  assertEquals(opts.subject, "Welcome to TermsDigest");
});

Deno.test("hasRequiredSmtpConfig - requires host, username, and password", () => {
  assertEquals(
    hasRequiredSmtpConfig({
      host: "smtp.example.com",
      username: "u",
      password: "p",
    }),
    true,
  );
  assertEquals(
    hasRequiredSmtpConfig({ host: "", username: "u", password: "p" }),
    false,
  );
  assertEquals(
    hasRequiredSmtpConfig({
      host: "smtp.example.com",
      username: null,
      password: "p",
    }),
    false,
  );
  assertEquals(
    hasRequiredSmtpConfig({
      host: "smtp.example.com",
      username: "u",
      password: undefined,
    }),
    false,
  );
});
