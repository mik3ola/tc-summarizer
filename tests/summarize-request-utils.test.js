import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  DEFAULT_MAX_TEXT_CHARS,
  EMPTY_TEXT_ERROR,
  buildSummaryCacheKey,
  resolveSummarizeTextInput,
} = require("../src/summarize-request-utils.js");

describe("buildSummaryCacheKey", () => {
  it("prefixes summary: for normalized URLs", () => {
    expect(buildSummaryCacheKey("https://example.com/terms")).toBe(
      "summary:https://example.com/terms"
    );
  });

  it("stringifies nullish / non-string inputs stably", () => {
    expect(buildSummaryCacheKey(null)).toBe("summary:");
    expect(buildSummaryCacheKey(undefined)).toBe("summary:");
    expect(buildSummaryCacheKey(42)).toBe("summary:42");
  });
});

describe("resolveSummarizeTextInput", () => {
  it("rejects empty / whitespace-only text with the historical error", () => {
    expect(resolveSummarizeTextInput("")).toEqual({
      ok: false,
      error: EMPTY_TEXT_ERROR,
    });
    expect(resolveSummarizeTextInput("   \n\t  ")).toEqual({
      ok: false,
      error: EMPTY_TEXT_ERROR,
    });
    expect(resolveSummarizeTextInput(null)).toEqual({
      ok: false,
      error: EMPTY_TEXT_ERROR,
    });
    expect(EMPTY_TEXT_ERROR).toBe("No text extracted from page.");
  });

  it("returns truncated text when over the default limit", () => {
    const long = "a".repeat(DEFAULT_MAX_TEXT_CHARS + 10);
    const result = resolveSummarizeTextInput(long);
    expect(result.ok).toBe(true);
    expect(result.text.length).toBe(DEFAULT_MAX_TEXT_CHARS);
    expect(DEFAULT_MAX_TEXT_CHARS).toBe(45_000);
  });

  it("honors a custom positive maxChars and ignores invalid limits", () => {
    expect(resolveSummarizeTextInput("abcdef", 3)).toEqual({
      ok: true,
      text: "abc",
    });
    const fallback = resolveSummarizeTextInput("hello", 0);
    expect(fallback).toEqual({ ok: true, text: "hello" });
  });
});
