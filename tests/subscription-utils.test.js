import { describe, it, expect } from "vitest";

function formatSubStatusLine(currentPeriodEnd) {
  if (!currentPeriodEnd) return "Subscription: Pro";
  const d = new Date(currentPeriodEnd);
  const fmt = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return `Subscription: Pro (expires ${fmt})`;
}

function formatSubAutoRenewLine(autoRenew, downgradeScheduledFor) {
  if (!autoRenew) {
    if (downgradeScheduledFor) {
      const d = new Date(downgradeScheduledFor);
      const fmt = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
      return `Auto-renewal: Disabled. Access until ${fmt}.`;
    }
    return "Auto-renewal: Disabled";
  }
  return "Auto-renewal: Enabled";
}

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
    expect(formatSubAutoRenewLine(true, "2026-02-27T00:00:00Z")).toBe("Auto-renewal: Enabled");
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
