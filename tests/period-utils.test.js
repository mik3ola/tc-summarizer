import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { computePeriodStart, computePeriodStartDate, MS_PER_PERIOD } =
  require("../src/period-utils.js");

/**
 * Mirror of backend summarize/lib.ts periodStart — used to assert client/server parity.
 * Keep in sync with that function; do not import Deno modules from Vitest.
 */
function serverPeriodStart(anchorDate, today = new Date()) {
  const anchorMs = new Date(anchorDate + "T00:00:00Z").getTime();
  const todayMs = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const elapsed = Math.max(0, todayMs - anchorMs);
  const periodsElapsed = Math.floor(elapsed / MS_PER_PERIOD);
  return new Date(anchorMs + periodsElapsed * MS_PER_PERIOD).toISOString().slice(0, 10);
}

describe("computePeriodStart (client quota period)", () => {
  it("matches server periodStart when an anchor is present", () => {
    const cases = [
      ["2026-01-20", "2026-01-20T00:00:00Z"],
      ["2026-01-20", "2026-02-18T12:00:00Z"],
      ["2026-01-20", "2026-02-19T00:00:00Z"],
      ["2026-01-20", "2026-02-25T00:00:00Z"],
      ["2026-01-20", "2026-03-21T00:00:00Z"],
      ["2026-03-01", "2026-02-01T00:00:00Z"]
    ];

    for (const [anchor, todayIso] of cases) {
      const today = new Date(todayIso);
      expect(computePeriodStart(anchor, today)).toBe(serverPeriodStart(anchor, today));
    }
  });

  it("returns YYYY-MM-DD for usage queries", () => {
    const result = computePeriodStart("2026-01-15", new Date("2026-01-15T00:00:00Z"));
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result).toBe("2026-01-15");
  });

  it("falls back to UTC calendar month start when anchor is missing", () => {
    expect(computePeriodStart(null, new Date("2026-07-22T15:30:00Z"))).toBe("2026-07-01");
    expect(computePeriodStart(undefined, new Date("2026-12-31T23:00:00Z"))).toBe("2026-12-01");
    expect(computePeriodStart("", new Date("2026-03-05T00:00:00Z"))).toBe("2026-03-01");
  });

  it("computePeriodStartDate is UTC midnight of the period start", () => {
    const d = computePeriodStartDate("2026-01-20", new Date("2026-02-25T18:00:00Z"));
    expect(d.toISOString()).toBe("2026-02-19T00:00:00.000Z");
    expect(d.getTime()).toBe(new Date("2026-02-19T00:00:00Z").getTime());
  });

  it("boundary: day 29 stays in period 0; day 30 starts period 1", () => {
    expect(computePeriodStart("2026-01-20", new Date("2026-02-18T23:59:59Z"))).toBe("2026-01-20");
    expect(computePeriodStart("2026-01-20", new Date("2026-02-19T00:00:00Z"))).toBe("2026-02-19");
  });
});
