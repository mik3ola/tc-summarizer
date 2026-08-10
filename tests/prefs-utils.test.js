import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  normalizePrefsPatch,
  resolveFormPreferenceValues,
  buildPreferencesFromForm,
  mergeNormalizedPreferences,
  DEFAULT_HOVER_DELAY,
} = require("../src/prefs-utils.js");

describe("normalizePrefsPatch", () => {
  it("returns {} for non-objects", () => {
    expect(normalizePrefsPatch(null)).toEqual({});
    expect(normalizePrefsPatch(undefined)).toEqual({});
    expect(normalizePrefsPatch("x")).toEqual({});
  });

  it("coerces string booleans for checkbox prefs only", () => {
    expect(
      normalizePrefsPatch({
        autoHover: "true",
        showRedFlags: "false",
        showQuotes: true,
        enableCaching: false,
        hoverDelay: "1000",
        unrelated: "true",
      })
    ).toEqual({
      autoHover: true,
      showRedFlags: false,
      showQuotes: true,
      enableCaching: false,
      hoverDelay: "1000",
      unrelated: "true",
    });
  });

  it("does not invent missing checkbox keys", () => {
    expect(normalizePrefsPatch({ hoverDelay: "500" })).toEqual({
      hoverDelay: "500",
    });
  });
});

describe("resolveFormPreferenceValues", () => {
  it("defaults missing prefs to enabled + 750ms delay", () => {
    expect(resolveFormPreferenceValues({})).toEqual({
      autoHover: true,
      showRedFlags: true,
      showQuotes: true,
      enableCaching: true,
      hoverDelay: DEFAULT_HOVER_DELAY,
    });
    expect(resolveFormPreferenceValues(null)).toEqual({
      autoHover: true,
      showRedFlags: true,
      showQuotes: true,
      enableCaching: true,
      hoverDelay: DEFAULT_HOVER_DELAY,
    });
  });

  it("honors explicit false (opt-out) and custom hover delay", () => {
    expect(
      resolveFormPreferenceValues({
        autoHover: false,
        showRedFlags: false,
        showQuotes: false,
        enableCaching: false,
        hoverDelay: "1500",
      })
    ).toEqual({
      autoHover: false,
      showRedFlags: false,
      showQuotes: false,
      enableCaching: false,
      hoverDelay: "1500",
    });
  });

  it("treats empty hoverDelay as default", () => {
    expect(resolveFormPreferenceValues({ hoverDelay: "" }).hoverDelay).toBe(
      DEFAULT_HOVER_DELAY
    );
  });
});

describe("buildPreferencesFromForm", () => {
  it("persists coerced booleans and hover delay", () => {
    expect(
      buildPreferencesFromForm({
        autoHover: 1,
        showRedFlags: 0,
        showQuotes: true,
        enableCaching: false,
        hoverDelay: "1500",
      })
    ).toEqual({
      autoHover: true,
      showRedFlags: false,
      showQuotes: true,
      enableCaching: false,
      hoverDelay: "1500",
    });
  });

  it("defaults missing hoverDelay on save", () => {
    expect(buildPreferencesFromForm({}).hoverDelay).toBe(DEFAULT_HOVER_DELAY);
  });
});

describe("mergeNormalizedPreferences", () => {
  it("merges a coerced patch onto the in-memory base", () => {
    expect(
      mergeNormalizedPreferences(
        { autoHover: true, hoverDelay: 750 },
        { autoHover: "false", showQuotes: "true" }
      )
    ).toEqual({
      autoHover: false,
      hoverDelay: 750,
      showQuotes: true,
    });
  });
});
