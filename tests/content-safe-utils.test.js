import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  isContextInvalidatedError,
  escapeHtml,
  escapeAttr,
} = require("../src/content-safe-utils.js");

describe("isContextInvalidatedError", () => {
  it("matches known extension-reload / port-closed messages", () => {
    expect(
      isContextInvalidatedError(new Error("Extension context invalidated."))
    ).toBe(true);
    expect(
      isContextInvalidatedError({ message: "The message port closed before a response was received." })
    ).toBe(true);
    expect(
      isContextInvalidatedError(new Error("Cannot read properties of undefined (reading 'get')"))
    ).toBe(true);
    expect(
      isContextInvalidatedError(new Error("Cannot read properties of undefined (reading 'sendMessage')"))
    ).toBe(true);
    expect(
      isContextInvalidatedError(new Error("Cannot read properties of undefined (reading 'runtime')"))
    ).toBe(true);
  });

  it("does not match unrelated errors", () => {
    expect(isContextInvalidatedError(new Error("Network request failed"))).toBe(
      false
    );
    expect(isContextInvalidatedError(new Error("Quota exceeded"))).toBe(false);
    expect(isContextInvalidatedError(null)).toBe(false);
  });
});

describe("escapeHtml / escapeAttr", () => {
  it("escapes HTML-sensitive characters", () => {
    expect(escapeHtml(`<img src=x onerror="alert('xss')"> & more`)).toBe(
      "&lt;img src=x onerror=&quot;alert(&#039;xss&#039;)&quot;&gt; &amp; more"
    );
  });

  it("flattens newlines for attribute-safe output", () => {
    expect(escapeAttr('Title\nwith "quotes"')).toBe(
      "Title with &quot;quotes&quot;"
    );
  });

  it("stringifies non-string input", () => {
    expect(escapeHtml(null)).toBe("null");
    expect(escapeHtml(42)).toBe("42");
  });
});
