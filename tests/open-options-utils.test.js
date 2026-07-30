import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  shouldPersistUpgradeIntent,
  optionsPageRelativePath,
  resolveOpenOptionsFallback,
} = require("../src/open-options-utils.js");

describe("shouldPersistUpgradeIntent", () => {
  it("is true only when upgrade is requested", () => {
    expect(shouldPersistUpgradeIntent(true)).toBe(true);
    expect(shouldPersistUpgradeIntent(false)).toBe(false);
    expect(shouldPersistUpgradeIntent(undefined)).toBe(false);
  });
});

describe("optionsPageRelativePath", () => {
  it("omits query by default and appends upgrade when requested", () => {
    expect(optionsPageRelativePath()).toBe("src/options.html");
    expect(optionsPageRelativePath(false)).toBe("src/options.html");
    expect(optionsPageRelativePath(true)).toBe("src/options.html?upgrade=true");
  });
});

describe("resolveOpenOptionsFallback", () => {
  it("returns done when openOptionsPage succeeded", () => {
    expect(
      resolveOpenOptionsFallback({
        hasOpenOptionsPageApi: true,
        openOptionsPageSucceeded: true,
        hasTabsCreate: true,
        upgrade: true,
      })
    ).toEqual({ action: "done" });
  });

  it("falls back to tabs.create when openOptionsPage fails (Safari/Chrome edge)", () => {
    expect(
      resolveOpenOptionsFallback({
        hasOpenOptionsPageApi: true,
        openOptionsPageSucceeded: false,
        hasTabsCreate: true,
        upgrade: false,
      })
    ).toEqual({ action: "tabs_create", path: "src/options.html" });
  });

  it("uses tabs.create with upgrade query when API is missing", () => {
    expect(
      resolveOpenOptionsFallback({
        hasOpenOptionsPageApi: false,
        openOptionsPageSucceeded: null,
        hasTabsCreate: true,
        upgrade: true,
      })
    ).toEqual({
      action: "tabs_create",
      path: "src/options.html?upgrade=true",
    });
  });

  it("reports unavailable when neither API works", () => {
    expect(
      resolveOpenOptionsFallback({
        hasOpenOptionsPageApi: false,
        openOptionsPageSucceeded: null,
        hasTabsCreate: false,
      })
    ).toEqual({ action: "unavailable" });
  });
});
