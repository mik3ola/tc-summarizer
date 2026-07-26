import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  CACHE_TTL_MS,
  MAX_TEXT_CHARS,
  MAX_CACHE_ENTRIES,
  isCachingEnabled,
  isCacheEntryFresh,
  truncateTextForSummary,
  pruneSummariesCache,
} = require("../src/cache-utils.js");

describe("isCachingEnabled", () => {
  it("defaults to enabled when preference is missing", () => {
    expect(isCachingEnabled(undefined)).toBe(true);
    expect(isCachingEnabled({})).toBe(true);
    expect(isCachingEnabled({ enableCaching: true })).toBe(true);
  });

  it("is disabled only when explicitly false", () => {
    expect(isCachingEnabled({ enableCaching: false })).toBe(false);
  });
});

describe("isCacheEntryFresh", () => {
  const now = Date.parse("2026-07-26T10:00:00.000Z");

  it("returns the entry when within TTL", () => {
    const entry = { summary: { tldr: "ok" }, createdAt: now - 1000 };
    expect(isCacheEntryFresh(entry, now, CACHE_TTL_MS)).toBe(entry);
  });

  it("rejects missing/invalid entries and expired TTL", () => {
    expect(isCacheEntryFresh(null, now)).toBe(null);
    expect(isCacheEntryFresh({}, now)).toBe(null);
    expect(isCacheEntryFresh({ createdAt: "nope" }, now)).toBe(null);
    expect(
      isCacheEntryFresh({ createdAt: now - CACHE_TTL_MS - 1 }, now)
    ).toBe(null);
  });

  it("accepts an entry exactly at the TTL boundary", () => {
    const entry = { createdAt: now - CACHE_TTL_MS };
    expect(isCacheEntryFresh(entry, now)).toBe(entry);
  });
});

describe("truncateTextForSummary", () => {
  it("leaves short text unchanged and coerces non-strings", () => {
    expect(truncateTextForSummary("hello")).toBe("hello");
    expect(truncateTextForSummary(null)).toBe("");
    expect(truncateTextForSummary(undefined)).toBe("");
  });

  it("truncates to MAX_TEXT_CHARS", () => {
    const raw = "a".repeat(MAX_TEXT_CHARS + 25);
    const out = truncateTextForSummary(raw);
    expect(out.length).toBe(MAX_TEXT_CHARS);
    expect(out).toBe("a".repeat(MAX_TEXT_CHARS));
  });
});

describe("pruneSummariesCache", () => {
  it("keeps caches under the cap untouched", () => {
    const cache = { a: { createdAt: 1 }, b: { createdAt: 2 } };
    expect(pruneSummariesCache(cache, 10)).toEqual(cache);
  });

  it("drops oldest entries when over max", () => {
    const cache = {};
    for (let i = 0; i < MAX_CACHE_ENTRIES + 3; i++) {
      cache[`k${i}`] = { createdAt: i + 1 };
    }
    const pruned = pruneSummariesCache(cache);
    expect(Object.keys(pruned)).toHaveLength(MAX_CACHE_ENTRIES);
    expect(pruned.k0).toBeUndefined();
    expect(pruned.k1).toBeUndefined();
    expect(pruned.k2).toBeUndefined();
    expect(pruned[`k${MAX_CACHE_ENTRIES + 2}`]).toBeTruthy();
  });

  it("tolerates non-object cache input", () => {
    expect(pruneSummariesCache(null, 2)).toEqual({});
    expect(pruneSummariesCache(undefined, 2)).toEqual({});
  });
});
