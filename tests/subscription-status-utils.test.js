import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  formatSubStatusLine,
  formatSubAutoRenewLine,
  resolveProManagementButtons,
} = require("../src/subscription-status-utils.js");

describe("formatSubStatusLine", () => {
  it("returns 'Subscription: Pro' when no period end", () => {
    expect(formatSubStatusLine(null)).toBe("Subscription: Pro");
    expect(formatSubStatusLine("")).toBe("Subscription: Pro");
  });

  it("includes expiry date when period end is provided", () => {
    const result = formatSubStatusLine("2026-02-27T00:00:00Z");
    expect(result).toContain("Subscription: Pro");
    expect(result).toContain("expires");
    expect(result).toMatch(/\d/);
  });
});

describe("formatSubAutoRenewLine", () => {
  it("returns enabled when autoRenew is true", () => {
    expect(formatSubAutoRenewLine(true, null)).toBe("Auto-renewal: Enabled");
    expect(formatSubAutoRenewLine(true, "2026-02-27T00:00:00Z")).toBe(
      "Auto-renewal: Enabled"
    );
  });

  it("returns disabled with date when autoRenew is false and date is set", () => {
    const result = formatSubAutoRenewLine(false, "2026-02-27T00:00:00Z");
    expect(result).toContain("Auto-renewal: Disabled");
    expect(result).toContain("Access until");
  });

  it("returns disabled without date when autoRenew is false and no date", () => {
    expect(formatSubAutoRenewLine(false, null)).toBe("Auto-renewal: Disabled");
  });
});

describe("resolveProManagementButtons", () => {
  it("shows cancel when auto-renew is on", () => {
    expect(resolveProManagementButtons({ autoRenew: true })).toEqual({
      showCancelAutoRenew: true,
      showReEnableAutoRenew: false,
      showDowngradeNow: true,
    });
  });

  it("shows re-enable when auto-renew is off", () => {
    expect(resolveProManagementButtons({ autoRenew: false })).toEqual({
      showCancelAutoRenew: false,
      showReEnableAutoRenew: true,
      showDowngradeNow: true,
    });
  });
});
