import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  shouldRefreshOptionsStatsOnUsageChange,
} = require("../src/options-usage-refresh-utils.js");

describe("shouldRefreshOptionsStatsOnUsageChange", () => {
  it("refreshes when local monthlyUsage value actually changes", () => {
    expect(
      shouldRefreshOptionsStatsOnUsageChange("local", {
        monthlyUsage: { oldValue: 3, newValue: 4 },
      })
    ).toBe(true);
  });

  it("skips when oldValue === newValue (no-op write)", () => {
    expect(
      shouldRefreshOptionsStatsOnUsageChange("local", {
        monthlyUsage: { oldValue: 5, newValue: 5 },
      })
    ).toBe(false);
  });

  it("refreshes on first set (undefined → number), matching historical options.js", () => {
    expect(
      shouldRefreshOptionsStatsOnUsageChange("local", {
        monthlyUsage: { oldValue: undefined, newValue: 0 },
      })
    ).toBe(true);
  });

  it("ignores non-local areas and unrelated keys", () => {
    expect(
      shouldRefreshOptionsStatsOnUsageChange("sync", {
        monthlyUsage: { oldValue: 1, newValue: 2 },
      })
    ).toBe(false);
    expect(
      shouldRefreshOptionsStatsOnUsageChange("local", {
        preferences: { oldValue: {}, newValue: { showQuotes: false } },
      })
    ).toBe(false);
    expect(shouldRefreshOptionsStatsOnUsageChange("local", null)).toBe(false);
    expect(shouldRefreshOptionsStatsOnUsageChange("local", {})).toBe(false);
  });

  it("ignores malformed monthlyUsage change entries", () => {
    expect(
      shouldRefreshOptionsStatsOnUsageChange("local", {
        monthlyUsage: null,
      })
    ).toBe(false);
    expect(
      shouldRefreshOptionsStatsOnUsageChange("local", {
        monthlyUsage: 7,
      })
    ).toBe(false);
  });
});
