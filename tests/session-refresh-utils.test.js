import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { pickNextRefreshToken } = require("../src/session-refresh-utils.js");

describe("pickNextRefreshToken", () => {
  it("prefers a non-empty response token under either policy", () => {
    expect(pickNextRefreshToken("new", "old")).toBe("new");
    expect(pickNextRefreshToken("new", "old", { preservePreviousIfMissing: true })).toBe(
      "new"
    );
  });

  it("background policy: does not fall back when response omits refresh_token", () => {
    expect(pickNextRefreshToken(undefined, "old")).toBeNull();
    expect(pickNextRefreshToken(null, "old")).toBeNull();
    expect(pickNextRefreshToken("", "old")).toBeNull();
  });

  it("options policy: preserves previous refresh_token when response omits one", () => {
    expect(
      pickNextRefreshToken(undefined, "old", { preservePreviousIfMissing: true })
    ).toBe("old");
    expect(pickNextRefreshToken(null, "old", { preservePreviousIfMissing: true })).toBe(
      "old"
    );
    expect(pickNextRefreshToken("", "old", { preservePreviousIfMissing: true })).toBe(
      "old"
    );
    expect(
      pickNextRefreshToken(undefined, null, { preservePreviousIfMissing: true })
    ).toBeNull();
  });
});
