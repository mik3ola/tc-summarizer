import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  detectTouchSummarize,
  detectTouchSummarizeFromWindow,
  resolveOptionsTouchSummarizeCopy,
} = require("../src/touch-device-utils.js");

describe("detectTouchSummarize", () => {
  it("treats coarse pointers as touch-first", () => {
    expect(detectTouchSummarize({ coarsePointer: true })).toBe(true);
  });

  it("detects iPhone / iPad / iPod user agents", () => {
    expect(
      detectTouchSummarize({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)" })
    ).toBe(true);
    expect(
      detectTouchSummarize({ userAgent: "Mozilla/5.0 (iPad; CPU OS 16_0)" })
    ).toBe(true);
    expect(
      detectTouchSummarize({ userAgent: "Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0)" })
    ).toBe(true);
  });

  it("detects iPadOS-as-Macintosh when maxTouchPoints > 1", () => {
    expect(
      detectTouchSummarize({
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        maxTouchPoints: 5,
      })
    ).toBe(true);
    expect(
      detectTouchSummarize({
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        maxTouchPoints: 1,
      })
    ).toBe(false);
  });

  it("stays false for desktop Chrome-like environments", () => {
    expect(
      detectTouchSummarize({
        coarsePointer: false,
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0",
        maxTouchPoints: 0,
      })
    ).toBe(false);
  });
});

describe("detectTouchSummarizeFromWindow", () => {
  it("reads matchMedia / navigator from an injectable window", () => {
    const win = {
      matchMedia: () => ({ matches: true }),
      navigator: { userAgent: "desktop", maxTouchPoints: 0 },
    };
    expect(detectTouchSummarizeFromWindow(win)).toBe(true);
  });

  it("returns false when window access throws", () => {
    const win = {
      get matchMedia() {
        throw new Error("blocked");
      },
    };
    expect(detectTouchSummarizeFromWindow(win)).toBe(false);
  });
});

describe("resolveOptionsTouchSummarizeCopy", () => {
  it("returns null when not touch-first", () => {
    expect(resolveOptionsTouchSummarizeCopy({ touchSummarize: false })).toBe(
      null
    );
    expect(resolveOptionsTouchSummarizeCopy({})).toBe(null);
  });

  it("returns British options copy for touch-first devices", () => {
    expect(resolveOptionsTouchSummarizeCopy({ touchSummarize: true })).toEqual({
      label: "Auto-summarise on tap",
      hint: "Automatically show summary when tapping legal links",
    });
  });
});
