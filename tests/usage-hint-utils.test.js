import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  getPlanQuota,
  computeRemainingSummaries,
  formatResetClause,
  buildUsageHint,
} = require("../src/usage-hint-utils.js");

describe("getPlanQuota", () => {
  it("maps Free / Pro / Enterprise tiers", () => {
    expect(getPlanQuota("free")).toBe(5);
    expect(getPlanQuota(undefined)).toBe(5);
    expect(getPlanQuota("pro")).toBe(50);
    expect(getPlanQuota("enterprise")).toBe(5000);
  });
});

describe("computeRemainingSummaries", () => {
  it("clamps at zero and tolerates bad inputs", () => {
    expect(computeRemainingSummaries(2, 5)).toBe(3);
    expect(computeRemainingSummaries(10, 5)).toBe(0);
    expect(computeRemainingSummaries(null, 5)).toBe(5);
  });
});

describe("formatResetClause", () => {
  const formatDate = () => "Jul 30, 2026";

  it("says today / tomorrow / in N days", () => {
    const now = new Date("2026-07-30T12:00:00Z");
    // Same instant → 0 days (ceil) → today
    expect(formatResetClause(now, now, formatDate)).toBe(
      "Resets today (Jul 30, 2026)"
    );
    // ~24h later → ceil ≈ 1 → tomorrow (matches options.js Math.ceil day math)
    expect(
      formatResetClause(new Date("2026-07-31T12:00:00Z"), now, formatDate)
    ).toBe("Resets tomorrow (Jul 30, 2026)");
    expect(
      formatResetClause(new Date("2026-08-05T12:00:00Z"), now, formatDate)
    ).toBe("Resets Jul 30, 2026 (in 6 days)");
  });
});

describe("buildUsageHint", () => {
  const reset = "Resets Aug 1, 2026 (in 2 days)";

  it("marks exhausted quota and prompts upgrade", () => {
    expect(buildUsageHint({ remaining: 0, resetClause: reset })).toEqual({
      text: `You've used all your inclusive summaries this month. ${reset}. Upgrade for more!`,
      tone: "exhausted",
    });
  });

  it("warns when two or fewer summaries remain", () => {
    expect(buildUsageHint({ remaining: 2, resetClause: reset })).toEqual({
      text: `Only 2 summaries left this month. ${reset}`,
      tone: "low",
    });
    expect(buildUsageHint({ remaining: 1, resetClause: reset })).toEqual({
      text: `Only 1 summary left this month. ${reset}`,
      tone: "low",
    });
  });

  it("uses calm copy when plenty remain", () => {
    expect(buildUsageHint({ remaining: 5, resetClause: reset })).toEqual({
      text: `5 summaries remaining this month. ${reset}`,
      tone: "ok",
    });
  });
});
