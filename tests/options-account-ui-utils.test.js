import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  resolveAccountCardVisibility,
  resolveOptionsTouchSummarizeCopy,
} = require("../src/options-account-ui-utils.js");

describe("resolveAccountCardVisibility", () => {
  it("shows Pro-only API card and subscription management for Pro", () => {
    expect(resolveAccountCardVisibility("pro")).toEqual({
      showStats: true,
      showApiCard: true,
      showSubManagement: true,
      showDangerZone: true,
      showDataCache: true,
      showUpgrade: false,
      showRefreshStatus: true,
      showActivePanel: true,
      showGuestStatus: false,
      badgeText: "Pro",
      badgeClass: "badge badge-success",
    });
  });

  it("hides API key card for Free (Pro-only feature) but keeps upgrade CTA", () => {
    expect(resolveAccountCardVisibility("free")).toEqual({
      showStats: true,
      showApiCard: false,
      showSubManagement: false,
      showDangerZone: true,
      showDataCache: true,
      showUpgrade: true,
      showRefreshStatus: true,
      showActivePanel: true,
      showGuestStatus: false,
      badgeText: "Free",
      badgeClass: "badge badge-warning",
    });
  });

  it("hides stats, API, danger, and cache for Guest", () => {
    expect(resolveAccountCardVisibility("guest")).toEqual({
      showStats: false,
      showApiCard: false,
      showSubManagement: false,
      showDangerZone: false,
      showDataCache: false,
      showUpgrade: false,
      showRefreshStatus: false,
      showActivePanel: false,
      showGuestStatus: true,
      badgeText: "Guest",
      badgeClass: "badge badge-info",
    });
  });

  it("treats unknown tiers as Guest (fail closed on sensitive cards)", () => {
    expect(resolveAccountCardVisibility("unknown").showApiCard).toBe(false);
    expect(resolveAccountCardVisibility(null).showDangerZone).toBe(false);
    expect(resolveAccountCardVisibility(undefined).badgeText).toBe("Guest");
  });
});

describe("resolveOptionsTouchSummarizeCopy", () => {
  it("returns null when not touch-first", () => {
    expect(resolveOptionsTouchSummarizeCopy({ touchSummarize: false })).toBe(null);
  });

  it("returns options (British) tap copy on touch-first devices", () => {
    expect(resolveOptionsTouchSummarizeCopy({ touchSummarize: true })).toEqual({
      label: "Auto-summarise on tap",
      hint: "Automatically show summary when tapping legal links",
    });
  });
});
