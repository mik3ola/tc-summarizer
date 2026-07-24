import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  optionsPagePath,
  resolveUpgradeIntent,
  isSafariExtensionUrl,
  isSessionExpired,
} = require("../src/upgrade-intent-utils.js");

describe("optionsPagePath", () => {
  it("returns plain options path by default", () => {
    expect(optionsPagePath()).toBe("src/options.html");
    expect(optionsPagePath(false)).toBe("src/options.html");
  });

  it("appends upgrade query when upgrade is requested", () => {
    expect(optionsPagePath(true)).toBe("src/options.html?upgrade=true");
  });
});

describe("resolveUpgradeIntent", () => {
  it("does not trigger when neither signal is set", () => {
    expect(resolveUpgradeIntent({})).toEqual({
      shouldUpgrade: false,
      clearStorageFlag: false,
      clearQuery: false,
    });
  });

  it("triggers from query and marks query for clearing", () => {
    expect(resolveUpgradeIntent({ fromQuery: true })).toEqual({
      shouldUpgrade: true,
      clearStorageFlag: false,
      clearQuery: true,
    });
  });

  it("triggers from Safari storage flag and marks flag for clearing", () => {
    expect(resolveUpgradeIntent({ openUpgradeIntent: true })).toEqual({
      shouldUpgrade: true,
      clearStorageFlag: true,
      clearQuery: false,
    });
  });

  it("accepts both signals", () => {
    expect(
      resolveUpgradeIntent({ fromQuery: true, openUpgradeIntent: true })
    ).toEqual({
      shouldUpgrade: true,
      clearStorageFlag: true,
      clearQuery: true,
    });
  });
});

describe("isSafariExtensionUrl", () => {
  it("detects safari-web-extension URLs only", () => {
    expect(isSafariExtensionUrl("safari-web-extension://abc/")).toBe(true);
    expect(isSafariExtensionUrl("chrome-extension://abc/")).toBe(false);
    expect(isSafariExtensionUrl("")).toBe(false);
    expect(isSafariExtensionUrl(null)).toBe(false);
  });
});

describe("isSessionExpired", () => {
  const now = 1_000_000;

  it("treats missing expiresAt as not expired", () => {
    expect(isSessionExpired(null, now)).toBe(false);
    expect(isSessionExpired(undefined, now)).toBe(false);
    expect(isSessionExpired(0, now)).toBe(false);
  });

  it("uses 5-minute buffer before treating session as expired", () => {
    // expires in 4 minutes → already inside buffer → expired
    expect(isSessionExpired(now + 4 * 60_000, now)).toBe(true);
    // expires in 6 minutes → still valid
    expect(isSessionExpired(now + 6 * 60_000, now)).toBe(false);
    // already past expiry
    expect(isSessionExpired(now - 1, now)).toBe(true);
  });
});
