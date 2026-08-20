import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  PRO_PLAN_HINT,
  FREE_PLAN_HINT,
  PRO_API_KEY_HINT_HTML,
  resolveSubscriptionManagementControls,
  resolvePlanHintText,
  resolveProApiKeyChrome,
} = require("../src/subscription-management-utils.js");

describe("resolveSubscriptionManagementControls", () => {
  it("shows cancel and hides re-enable while auto-renew is on", () => {
    expect(resolveSubscriptionManagementControls({ autoRenew: true })).toEqual({
      cancelDisplay: "inline-block",
      reEnableDisplay: "none",
      downgradeDisplay: "inline-block",
    });
  });

  it("shows re-enable and hides cancel when auto-renew is off", () => {
    expect(resolveSubscriptionManagementControls({ autoRenew: false })).toEqual({
      cancelDisplay: "none",
      reEnableDisplay: "inline-block",
      downgradeDisplay: "inline-block",
    });
  });

  it("defaults to renewing (cancel visible) when autoRenew omitted", () => {
    expect(resolveSubscriptionManagementControls()).toEqual({
      cancelDisplay: "inline-block",
      reEnableDisplay: "none",
      downgradeDisplay: "inline-block",
    });
  });

  it("always keeps downgrade_now available in the Pro management section", () => {
    expect(
      resolveSubscriptionManagementControls({ autoRenew: true }).downgradeDisplay
    ).toBe("inline-block");
    expect(
      resolveSubscriptionManagementControls({ autoRenew: false }).downgradeDisplay
    ).toBe("inline-block");
  });
});

describe("resolvePlanHintText", () => {
  it("returns Pro inclusive-quota + own-key copy", () => {
    expect(resolvePlanHintText("pro")).toBe(PRO_PLAN_HINT);
    expect(resolvePlanHintText("pro")).toContain("50 summaries/month");
    expect(resolvePlanHintText("pro")).toContain("API key");
  });

  it("returns Free upgrade copy mentioning API key access", () => {
    expect(resolvePlanHintText("free")).toBe(FREE_PLAN_HINT);
    expect(resolvePlanHintText("free")).toContain("5 summaries/month");
    expect(resolvePlanHintText("free")).toContain("API key access");
  });

  it("returns null for guest / unknown (call site leaves hint alone)", () => {
    expect(resolvePlanHintText("guest")).toBe(null);
    expect(resolvePlanHintText(null)).toBe(null);
    expect(resolvePlanHintText(undefined)).toBe(null);
  });
});

describe("resolveProApiKeyChrome", () => {
  it("locks Optional badge and unlimited hint HTML for Pro", () => {
    expect(resolveProApiKeyChrome()).toEqual({
      hintHtml: PRO_API_KEY_HINT_HTML,
      badgeText: "Optional",
      badgeClass: "badge badge-info",
    });
    expect(PRO_API_KEY_HINT_HTML).toContain("<strong>unlimited</strong>");
  });
});
