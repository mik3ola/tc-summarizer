import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  EXPORT_STORAGE_KEYS,
  FORBIDDEN_EXPORT_KEYS,
  buildExportPayload,
  buildExportFilename,
  isForbiddenExportKey,
} = require("../src/data-export-utils.js");

describe("EXPORT_STORAGE_KEYS", () => {
  it("only includes summariesCache and preferences", () => {
    expect([...EXPORT_STORAGE_KEYS]).toEqual(["summariesCache", "preferences"]);
  });

  it("never overlaps the forbidden secret/account key list", () => {
    for (const key of EXPORT_STORAGE_KEYS) {
      expect(FORBIDDEN_EXPORT_KEYS).not.toContain(key);
    }
  });
});

describe("buildExportPayload", () => {
  it("picks only cache + preferences from a full storage snapshot", () => {
    const payload = buildExportPayload({
      summariesCache: { "summary:example.com": { summary: { tldr: "x" } } },
      preferences: { showRedFlags: true },
      openaiApiKey: "sk-secret",
      supabaseSession: { access_token: "tok" },
      userEmail: "user@example.com",
      subscription: "active",
      subscriptionPlan: "pro",
      monthlyUsage: 12,
    });

    expect(payload).toEqual({
      summariesCache: { "summary:example.com": { summary: { tldr: "x" } } },
      preferences: { showRedFlags: true },
    });
    expect(Object.keys(payload).sort()).toEqual([
      "preferences",
      "summariesCache",
    ]);
  });

  it("defaults missing keys to empty objects", () => {
    expect(buildExportPayload(null)).toEqual({
      summariesCache: {},
      preferences: {},
    });
    expect(buildExportPayload({})).toEqual({
      summariesCache: {},
      preferences: {},
    });
    expect(buildExportPayload({ summariesCache: null, preferences: "bad" })).toEqual({
      summariesCache: {},
      preferences: {},
    });
  });
});

describe("buildExportFilename", () => {
  it("uses termsdigest-data-<ms>.json", () => {
    expect(buildExportFilename(1700000000000)).toBe(
      "termsdigest-data-1700000000000.json"
    );
  });

  it("floors non-integer timestamps and falls back for NaN", () => {
    expect(buildExportFilename(12.9)).toBe("termsdigest-data-12.json");
    expect(buildExportFilename(Number.NaN)).toBe("termsdigest-data-0.json");
  });
});

describe("isForbiddenExportKey", () => {
  it("flags API key and session fields", () => {
    expect(isForbiddenExportKey("openaiApiKey")).toBe(true);
    expect(isForbiddenExportKey("supabaseSession")).toBe(true);
    expect(isForbiddenExportKey("summariesCache")).toBe(false);
  });
});
