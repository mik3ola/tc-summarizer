import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  countCacheEntries,
  resolveDisplayedUsage,
  estimateTotalMinutesSavedFromCache,
} = require("../src/options-stats-utils.js");

describe("countCacheEntries", () => {
  it("counts object keys and tolerates missing cache", () => {
    expect(countCacheEntries(null)).toBe(0);
    expect(countCacheEntries(undefined)).toBe(0);
    expect(countCacheEntries({})).toBe(0);
    expect(
      countCacheEntries({
        "summary:a": { originalTextLength: 100 },
        "summary:b": { originalTextLength: 200 },
      })
    ).toBe(2);
  });
});

describe("resolveDisplayedUsage", () => {
  it("prefers monthlyUsage including zero; falls back to local totals", () => {
    expect(resolveDisplayedUsage(3, 99)).toBe(3);
    expect(resolveDisplayedUsage(0, 99)).toBe(0);
    expect(resolveDisplayedUsage(null, 12)).toBe(12);
    expect(resolveDisplayedUsage(undefined, 12)).toBe(12);
    expect(resolveDisplayedUsage(undefined, null)).toBe(0);
  });
});

describe("estimateTotalMinutesSavedFromCache", () => {
  it("returns 0 for empty / missing cache or entries without length", () => {
    expect(estimateTotalMinutesSavedFromCache(null)).toBe(0);
    expect(estimateTotalMinutesSavedFromCache({})).toBe(0);
    expect(
      estimateTotalMinutesSavedFromCache({
        "summary:a": {},
        "summary:b": { originalTextLength: 0 },
      })
    ).toBe(0);
  });

  it("sums words across entries then converts at 200 wpm (options aggregate)", () => {
    // 1000 chars → 200 words; 500 chars → 100 words; total 300 words → 1 minute
    expect(
      estimateTotalMinutesSavedFromCache({
        "summary:a": { originalTextLength: 1000 },
        "summary:b": { originalTextLength: 500 },
      })
    ).toBe(1);

    // 5 * 1000 chars → 5 * 200 words = 1000 words → 5 minutes
    expect(
      estimateTotalMinutesSavedFromCache({
        a: { originalTextLength: 1000 },
        b: { originalTextLength: 1000 },
        c: { originalTextLength: 1000 },
        d: { originalTextLength: 1000 },
        e: { originalTextLength: 1000 },
      })
    ).toBe(5);
  });

  it("floors per-entry word counts before summing (matches options.js)", () => {
    // 9 chars → floor(9/5)=1 word each; three entries → 3 words → floor(3/200)=0
    expect(
      estimateTotalMinutesSavedFromCache({
        a: { originalTextLength: 9 },
        b: { originalTextLength: 9 },
        c: { originalTextLength: 9 },
      })
    ).toBe(0);

    // 999 chars → floor(999/5)=199 words → floor(199/200)=0
    expect(
      estimateTotalMinutesSavedFromCache({
        a: { originalTextLength: 999 },
      })
    ).toBe(0);

    // 1000 chars → 200 words → 1 minute
    expect(
      estimateTotalMinutesSavedFromCache({
        a: { originalTextLength: 1000 },
      })
    ).toBe(1);
  });
});
