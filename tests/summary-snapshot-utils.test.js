import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  emptySummarySnapshot,
  buildSummarySnapshot,
  hasUsableSummarySnapshot,
  shouldRefreshSummaryIfVisible,
  shouldHandleLocalStorageChange,
  shouldRefreshFooterOnUsageChange,
  resolvePreferencesStorageChange,
} = require("../src/summary-snapshot-utils.js");

describe("emptySummarySnapshot / buildSummarySnapshot", () => {
  it("clears all snapshot fields", () => {
    expect(emptySummarySnapshot()).toEqual({
      lastSummary: null,
      lastSummaryUrl: null,
      lastSummaryFromCache: false,
    });
  });

  it("stores summary, url, and cache flag (coerces fromCache)", () => {
    const summary = { title: "Terms", tldr: "Be careful" };
    expect(buildSummarySnapshot(summary, "https://ex.com/terms", 1)).toEqual({
      lastSummary: summary,
      lastSummaryUrl: "https://ex.com/terms",
      lastSummaryFromCache: true,
    });
    expect(buildSummarySnapshot(summary, "", false).lastSummaryUrl).toBe("");
    expect(buildSummarySnapshot(null, null, false)).toEqual({
      lastSummary: null,
      lastSummaryUrl: null,
      lastSummaryFromCache: false,
    });
  });
});

describe("hasUsableSummarySnapshot / shouldRefreshSummaryIfVisible", () => {
  const usable = buildSummarySnapshot({ title: "T" }, "https://ex.com", false);

  it("requires a truthy summary and non-nullish url", () => {
    expect(hasUsableSummarySnapshot(usable)).toBe(true);
    expect(hasUsableSummarySnapshot(buildSummarySnapshot({ title: "T" }, "", false))).toBe(
      true
    );
    expect(hasUsableSummarySnapshot(emptySummarySnapshot())).toBe(false);
    expect(hasUsableSummarySnapshot(buildSummarySnapshot(null, "https://ex.com", false))).toBe(
      false
    );
    expect(hasUsableSummarySnapshot(buildSummarySnapshot({ title: "T" }, null, false))).toBe(
      false
    );
  });

  it("only refreshes when context is valid, popover is visible, and snapshot is usable", () => {
    expect(
      shouldRefreshSummaryIfVisible({
        contextValid: true,
        popoverVisible: true,
        snapshot: usable,
      })
    ).toBe(true);
    expect(
      shouldRefreshSummaryIfVisible({
        contextValid: false,
        popoverVisible: true,
        snapshot: usable,
      })
    ).toBe(false);
    expect(
      shouldRefreshSummaryIfVisible({
        contextValid: true,
        popoverVisible: false,
        snapshot: usable,
      })
    ).toBe(false);
    expect(
      shouldRefreshSummaryIfVisible({
        contextValid: true,
        popoverVisible: true,
        snapshot: emptySummarySnapshot(),
      })
    ).toBe(false);
  });
});

describe("storage listener routing", () => {
  it("only handles the local storage area", () => {
    expect(shouldHandleLocalStorageChange("local")).toBe(true);
    expect(shouldHandleLocalStorageChange("sync")).toBe(false);
    expect(shouldHandleLocalStorageChange(undefined)).toBe(false);
  });

  it("detects monthlyUsage changes for footer refresh", () => {
    expect(shouldRefreshFooterOnUsageChange({ monthlyUsage: { newValue: 3 } })).toBe(
      true
    );
    expect(shouldRefreshFooterOnUsageChange({ preferences: { newValue: {} } })).toBe(
      false
    );
    expect(shouldRefreshFooterOnUsageChange(null)).toBe(false);
  });

  it("applies object preference patches and reloads otherwise", () => {
    expect(resolvePreferencesStorageChange({})).toEqual({ action: "ignore" });
    expect(
      resolvePreferencesStorageChange({
        preferences: { newValue: { showRedFlags: false } },
      })
    ).toEqual({
      action: "apply_patch",
      patch: { showRedFlags: false },
    });
    expect(
      resolvePreferencesStorageChange({
        preferences: { newValue: null },
      })
    ).toEqual({ action: "reload" });
    expect(
      resolvePreferencesStorageChange({
        preferences: { newValue: "bogus" },
      })
    ).toEqual({ action: "reload" });
  });
});
