import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { normalizeUrl } = require("../src/url-normalize-utils.js");

describe("normalizeUrl", () => {
  it("strips hash fragments so section links share a cache key", () => {
    expect(normalizeUrl("https://example.com/terms#cancellation")).toBe(
      "https://example.com/terms"
    );
    expect(normalizeUrl("https://example.com/privacy#")).toBe(
      "https://example.com/privacy"
    );
  });

  it("preserves query strings and path", () => {
    expect(normalizeUrl("https://example.com/legal?lang=en#top")).toBe(
      "https://example.com/legal?lang=en"
    );
    expect(normalizeUrl("https://example.com/a/b/c")).toBe(
      "https://example.com/a/b/c"
    );
  });

  it("returns the original value when URL parsing fails", () => {
    expect(normalizeUrl("not a url")).toBe("not a url");
    expect(normalizeUrl("")).toBe("");
    expect(normalizeUrl(null)).toBe(null);
    expect(normalizeUrl(undefined)).toBe(undefined);
  });
});
