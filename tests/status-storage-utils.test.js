import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  pickFirstRow,
  mapSubscriptionRow,
  resolveMonthlyUsageForStorage,
  buildBackgroundStatusStoragePatch,
  buildOptionsSubscriptionStoragePatch,
  buildClearedSubscriptionStoragePatch,
} = require("../src/status-storage-utils.js");

describe("pickFirstRow", () => {
  it("returns the first element of an array", () => {
    expect(pickFirstRow([{ id: 1 }, { id: 2 }])).toEqual({ id: 1 });
  });

  it("returns a single object as-is", () => {
    expect(pickFirstRow({ id: 9 })).toEqual({ id: 9 });
  });

  it("returns undefined for empty array", () => {
    expect(pickFirstRow([])).toBeUndefined();
  });
});

describe("mapSubscriptionRow", () => {
  it("maps fields and defaults auto_renew to true when missing/null", () => {
    expect(
      mapSubscriptionRow({
        status: "active",
        plan: "pro",
        downgrade_scheduled_for: "2026-09-01T00:00:00Z",
        current_period_end: "2026-09-01T00:00:00Z",
      })
    ).toEqual({
      status: "active",
      plan: "pro",
      autoRenew: true,
      downgradeScheduledFor: "2026-09-01T00:00:00Z",
      currentPeriodEnd: "2026-09-01T00:00:00Z",
    });

    expect(mapSubscriptionRow({ status: "active", plan: "pro", auto_renew: null }).autoRenew).toBe(
      true
    );
  });

  it("treats explicit auto_renew=false as disabled", () => {
    expect(
      mapSubscriptionRow({ status: "active", plan: "pro", auto_renew: false }).autoRenew
    ).toBe(false);
  });

  it("returns null for missing rows", () => {
    expect(mapSubscriptionRow(null)).toBe(null);
    expect(mapSubscriptionRow(undefined)).toBe(null);
  });
});

describe("resolveMonthlyUsageForStorage", () => {
  it("accepts positive fetched usage", () => {
    expect(resolveMonthlyUsageForStorage(7, 3)).toBe(7);
  });

  it("accepts explicit 0 only when storage has never set monthlyUsage", () => {
    expect(resolveMonthlyUsageForStorage(0, undefined)).toBe(0);
  });

  it("preserves existing usage when fetched is 0 and storage already has a value", () => {
    expect(resolveMonthlyUsageForStorage(0, 5)).toBe(5);
    expect(resolveMonthlyUsageForStorage(0, 0)).toBe(0);
  });
});

describe("buildBackgroundStatusStoragePatch", () => {
  it("merges fetched status while preserving prior fields on null", () => {
    const patch = buildBackgroundStatusStoragePatch({
      status: null,
      plan: null,
      monthlyUsage: 0,
      cycleAnchorDate: null,
      sessionEmail: null,
      currentStorage: {
        subscription: "active",
        subscriptionPlan: "pro",
        userEmail: "a@example.com",
        monthlyUsage: 12,
        cycleAnchorDate: "2026-01-15",
      },
    });

    expect(patch).toEqual({
      subscription: "active",
      subscriptionPlan: "pro",
      userEmail: "a@example.com",
      monthlyUsage: 12,
      cycleAnchorDate: "2026-01-15",
    });
  });

  it("writes successful status/usage/email/anchor updates", () => {
    const patch = buildBackgroundStatusStoragePatch({
      status: "past_due",
      plan: "pro",
      monthlyUsage: 4,
      cycleAnchorDate: "2026-02-01",
      sessionEmail: "new@example.com",
      currentStorage: {
        subscription: "active",
        subscriptionPlan: "pro",
        userEmail: "old@example.com",
        monthlyUsage: 1,
        cycleAnchorDate: "2026-01-01",
      },
    });

    expect(patch).toEqual({
      subscription: "past_due",
      subscriptionPlan: "pro",
      userEmail: "new@example.com",
      monthlyUsage: 4,
      cycleAnchorDate: "2026-02-01",
    });
  });
});

describe("buildOptionsSubscriptionStoragePatch / clear", () => {
  it("overwrites management fields on successful options refresh", () => {
    expect(
      buildOptionsSubscriptionStoragePatch({
        status: "active",
        plan: "pro",
        autoRenew: false,
        downgradeScheduledFor: "2026-10-01T00:00:00Z",
        currentPeriodEnd: "2026-10-01T00:00:00Z",
        monthlyUsage: 9,
        cycleAnchorDate: "2026-03-01",
        userEmail: "pro@example.com",
      })
    ).toEqual({
      subscription: "active",
      subscriptionPlan: "pro",
      userEmail: "pro@example.com",
      monthlyUsage: 9,
      cycleAnchorDate: "2026-03-01",
      subscriptionAutoRenew: false,
      subscriptionDowngradeScheduledFor: "2026-10-01T00:00:00Z",
      currentPeriodEnd: "2026-10-01T00:00:00Z",
    });
  });

  it("clears only subscription + plan when no row exists", () => {
    expect(buildClearedSubscriptionStoragePatch()).toEqual({
      subscription: null,
      subscriptionPlan: null,
    });
  });
});
