import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { buildFallbackSummary } = require("../src/summary-fallback-utils.js");

describe("buildFallbackSummary", () => {
  it("preserves trimmed raw text as tldr with low confidence", () => {
    const s = buildFallbackSummary("  Raw model prose.  ");
    expect(s.tldr).toBe("Raw model prose.");
    expect(s.title).toBe("");
    expect(s.confidence).toBe("low");
    expect(s._note).toContain("valid JSON");
    expect(s.costs_and_renewal).toEqual([]);
    expect(s.cancellation_and_refunds).toEqual([]);
    expect(s.liability_and_disputes).toEqual([]);
    expect(s.privacy_and_data).toEqual([]);
    expect(s.red_flags).toEqual([]);
    expect(s.quotes).toEqual([]);
  });

  it("handles empty, null, and non-string input safely", () => {
    expect(buildFallbackSummary("").tldr).toBe("");
    expect(buildFallbackSummary("   ").tldr).toBe("");
    expect(buildFallbackSummary(null).tldr).toBe("");
    expect(buildFallbackSummary(undefined).tldr).toBe("");
    expect(buildFallbackSummary(42).tldr).toBe("42");
  });
});
