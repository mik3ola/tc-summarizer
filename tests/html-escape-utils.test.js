import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { escapeHtml, escapeAttr } = require("../src/html-escape-utils.js");

describe("escapeHtml", () => {
  it("escapes the five HTML-sensitive characters in historical order", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#039;");
  });

  it("does not double-escape already-escaped entities when & is first", () => {
    expect(escapeHtml("&amp;")).toBe("&amp;amp;");
    expect(escapeHtml("<script>alert(1)</script>")).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;"
    );
  });

  it("stringifies nullish and non-string values", () => {
    expect(escapeHtml(null)).toBe("null");
    expect(escapeHtml(undefined)).toBe("undefined");
    expect(escapeHtml(42)).toBe("42");
  });

  it("leaves plain summary text unchanged", () => {
    expect(escapeHtml("Auto-renews after trial")).toBe(
      "Auto-renews after trial"
    );
  });
});

describe("escapeAttr", () => {
  it("applies HTML escaping then flattens newlines for attribute values", () => {
    expect(escapeAttr('Title with "quotes"\nand newline')).toBe(
      "Title with &quot;quotes&quot; and newline"
    );
  });

  it("collapses multiple newlines to spaces", () => {
    expect(escapeAttr("a\n\nb")).toBe("a  b");
  });
});
