import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  RECOVERY_REDIRECT_TO,
  resolveForgotPasswordGate,
  resolveForgotPasswordHttpOutcome,
  buildRecoverUrl,
} = require("../src/password-recovery-utils.js");

describe("resolveForgotPasswordGate", () => {
  it("requires a non-empty trimmed email", () => {
    expect(resolveForgotPasswordGate("")).toEqual({
      ok: false,
      reason: "missing_email",
    });
    expect(resolveForgotPasswordGate("   ")).toEqual({
      ok: false,
      reason: "missing_email",
    });
    expect(resolveForgotPasswordGate(null)).toEqual({
      ok: false,
      reason: "missing_email",
    });
  });

  it("returns trimmed email when present", () => {
    expect(resolveForgotPasswordGate("  user@example.com  ")).toEqual({
      ok: true,
      email: "user@example.com",
    });
  });
});

describe("resolveForgotPasswordHttpOutcome", () => {
  it("treats ok or status 200 as success (popup inclusive check)", () => {
    expect(resolveForgotPasswordHttpOutcome({ ok: true, status: 201 })).toBe(
      "success"
    );
    expect(resolveForgotPasswordHttpOutcome({ ok: false, status: 200 })).toBe(
      "success"
    );
  });

  it("treats other statuses as failure", () => {
    expect(resolveForgotPasswordHttpOutcome({ ok: false, status: 400 })).toBe(
      "failure"
    );
    expect(resolveForgotPasswordHttpOutcome({})).toBe("failure");
  });
});

describe("buildRecoverUrl", () => {
  it("targets production reset-password redirect (never localhost)", () => {
    expect(RECOVERY_REDIRECT_TO).toBe(
      "https://termsdigest.com/auth/reset-password"
    );
    expect(RECOVERY_REDIRECT_TO).not.toContain("localhost");

    const url = buildRecoverUrl("https://rsxvxezucgczesplmjiw.supabase.co/");
    expect(url).toBe(
      `https://rsxvxezucgczesplmjiw.supabase.co/auth/v1/recover?redirect_to=${RECOVERY_REDIRECT_TO}`
    );
  });
});
