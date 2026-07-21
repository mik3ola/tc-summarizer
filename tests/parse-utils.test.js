import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { normalizeUrl, safeJsonParse } = require("../src/parse-utils.js");

describe("normalizeUrl", () => {
  it("strips hash fragments used as cache keys", () => {
    expect(normalizeUrl("https://example.com/terms#section-2")).toBe(
      "https://example.com/terms"
    );
  });

  it("preserves query strings", () => {
    expect(normalizeUrl("https://example.com/legal?lang=en")).toBe(
      "https://example.com/legal?lang=en"
    );
  });

  it("returns the original string when URL parsing fails", () => {
    expect(normalizeUrl("not a url")).toBe("not a url");
  });
});

describe("safeJsonParse", () => {
  it("parses plain JSON", () => {
    const result = safeJsonParse('{"title":"Terms","confidence":"high"}');
    expect(result.ok).toBe(true);
    expect(result.value).toEqual({ title: "Terms", confidence: "high" });
  });

  it("strips markdown fences from model output", () => {
    const fenced = "```json\n{\"tldr\":\"Keep receipts\"}\n```";
    const result = safeJsonParse(fenced);
    expect(result.ok).toBe(true);
    expect(result.value).toEqual({ tldr: "Keep receipts" });
  });

  it("strips bare markdown fences", () => {
    const fenced = "```\n{\"ok\":true}\n```";
    const result = safeJsonParse(fenced);
    expect(result.ok).toBe(true);
    expect(result.value).toEqual({ ok: true });
  });

  it("returns ok:false for invalid JSON", () => {
    const result = safeJsonParse("not-json");
    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
  });
});
