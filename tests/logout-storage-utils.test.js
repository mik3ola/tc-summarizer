import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { buildLogoutLocalStoragePatch } = require("../src/logout-storage-utils.js");

describe("buildLogoutLocalStoragePatch", () => {
  it("clears session, plan, and schedule fields to null", () => {
    expect(buildLogoutLocalStoragePatch()).toEqual({
      subscription: null,
      subscriptionPlan: null,
      userEmail: null,
      supabaseSession: null,
      subscriptionAutoRenew: null,
      subscriptionDowngradeScheduledFor: null,
      currentPeriodEnd: null,
    });
  });

  it("returns a fresh object each call (no shared mutable patch)", () => {
    const a = buildLogoutLocalStoragePatch();
    const b = buildLogoutLocalStoragePatch();
    expect(a).not.toBe(b);
    a.subscription = "active";
    expect(b.subscription).toBe(null);
  });
});
