import { describe, it, expect } from "vitest";
import {
  parseStoredTheme,
  resolveInitialTheme,
  shouldFollowSystemTheme,
  nextTheme,
} from "../website/src/lib/theme-utils.ts";

describe("parseStoredTheme", () => {
  it("accepts only light/dark", () => {
    expect(parseStoredTheme("light")).toBe("light");
    expect(parseStoredTheme("dark")).toBe("dark");
    expect(parseStoredTheme(null)).toBe(null);
    expect(parseStoredTheme(undefined)).toBe(null);
    expect(parseStoredTheme("")).toBe(null);
    expect(parseStoredTheme("auto")).toBe(null);
  });
});

describe("resolveInitialTheme", () => {
  it("prefers explicit stored theme over OS", () => {
    expect(resolveInitialTheme("light", true)).toBe("light");
    expect(resolveInitialTheme("dark", false)).toBe("dark");
  });

  it("falls back to OS preference when unset or invalid", () => {
    expect(resolveInitialTheme(null, true)).toBe("dark");
    expect(resolveInitialTheme(null, false)).toBe("light");
    expect(resolveInitialTheme("", true)).toBe("dark");
    expect(resolveInitialTheme("auto", false)).toBe("light");
  });
});

describe("shouldFollowSystemTheme", () => {
  it("follows OS only when storage is empty/null (historical truthy getItem gate)", () => {
    expect(shouldFollowSystemTheme(null)).toBe(true);
    expect(shouldFollowSystemTheme(undefined)).toBe(true);
    expect(shouldFollowSystemTheme("")).toBe(true);
    expect(shouldFollowSystemTheme("light")).toBe(false);
    expect(shouldFollowSystemTheme("dark")).toBe(false);
    // Invalid but non-empty still blocks live OS follow (historical quirk)
    expect(shouldFollowSystemTheme("auto")).toBe(false);
  });
});

describe("nextTheme", () => {
  it("toggles dark ↔ light", () => {
    expect(nextTheme("dark")).toBe("light");
    expect(nextTheme("light")).toBe("dark");
  });
});
