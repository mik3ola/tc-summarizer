import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { isExtensionContextValid } = require("../src/extension-context-utils.js");

describe("isExtensionContextValid", () => {
  it("is true when chrome.runtime.id is present", () => {
    expect(
      isExtensionContextValid({ runtime: { id: "abcdefghijklmnop" } })
    ).toBe(true);
  });

  it("is false when runtime or id is missing (reload / invalidated context)", () => {
    expect(isExtensionContextValid(undefined)).toBe(false);
    expect(isExtensionContextValid(null)).toBe(false);
    expect(isExtensionContextValid({})).toBe(false);
    expect(isExtensionContextValid({ runtime: {} })).toBe(false);
    expect(isExtensionContextValid({ runtime: { id: "" } })).toBe(false);
    expect(isExtensionContextValid({ runtime: { id: null } })).toBe(false);
  });

  it("returns false when accessing chrome throws (hostile / partial host)", () => {
    const throwing = {
      get runtime() {
        throw new Error("Extension context invalidated.");
      },
    };
    expect(isExtensionContextValid(throwing)).toBe(false);
  });
});
