import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { buildDowngradeLocalStoragePatch } = require("../src/downgrade-storage-utils.js");

describe("buildDowngradeLocalStoragePatch", () => {
  it("stores cancel_auto_renew schedule + period end from API subscription", () => {
    expect(
      buildDowngradeLocalStoragePatch("cancel_auto_renew", {
        downgrade_scheduled_for: "2026-09-15T00:00:00Z",
        current_period_end: "2026-09-15T00:00:00Z",
        status: "active",
        plan: "pro",
      })
    ).toEqual({
      subscriptionAutoRenew: false,
      subscriptionDowngradeScheduledFor: "2026-09-15T00:00:00Z",
      currentPeriodEnd: "2026-09-15T00:00:00Z",
    });
  });

  it("nulls missing cancel schedule/period fields", () => {
    expect(buildDowngradeLocalStoragePatch("cancel_auto_renew", {})).toEqual({
      subscriptionAutoRenew: false,
      subscriptionDowngradeScheduledFor: null,
      currentPeriodEnd: null,
    });
  });

  it("re-enables auto-renew and clears scheduled downgrade", () => {
    expect(
      buildDowngradeLocalStoragePatch("re_enable_auto_renew", {
        downgrade_scheduled_for: "2026-09-15T00:00:00Z",
      })
    ).toEqual({
      subscriptionAutoRenew: true,
      subscriptionDowngradeScheduledFor: null,
    });
  });

  it("applies downgrade_now status/plan and clears local schedule/period end", () => {
    // Historical options.js always clears scheduled-for + period-end locally,
    // even if the API returns a scheduled remaining-period outcome.
    expect(
      buildDowngradeLocalStoragePatch("downgrade_now", {
        status: "canceled",
        plan: "free",
        downgrade_scheduled_for: "2026-09-15T00:00:00Z",
        current_period_end: "2026-09-15T00:00:00Z",
      })
    ).toEqual({
      subscription: "canceled",
      subscriptionPlan: "free",
      subscriptionAutoRenew: false,
      subscriptionDowngradeScheduledFor: null,
      currentPeriodEnd: null,
    });

    expect(
      buildDowngradeLocalStoragePatch("downgrade_now", {
        status: "active",
        plan: "pro",
        current_period_end: "2026-09-15T00:00:00Z",
        downgrade_scheduled_for: "2026-09-15T00:00:00Z",
      })
    ).toEqual({
      subscription: "active",
      subscriptionPlan: "pro",
      subscriptionAutoRenew: false,
      subscriptionDowngradeScheduledFor: null,
      currentPeriodEnd: null,
    });
  });

  it("returns null for unknown actions", () => {
    expect(buildDowngradeLocalStoragePatch("nope", {})).toBe(null);
    expect(buildDowngradeLocalStoragePatch(null, {})).toBe(null);
  });
});
