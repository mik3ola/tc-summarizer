import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  CLICK_AND_RETRY_WAIT_MS,
  CONTENT_STILL_NOT_FOUND_MESSAGE,
  shouldStartClickAndRetry,
  buildClickAndRetryLoadingUrl,
  resolveClickAndRetryPostWaitOutcome,
} = require("../src/click-and-retry-utils.js");

describe("shouldStartClickAndRetry", () => {
  it("requires both the click-and-retry action and an anchor", () => {
    expect(
      shouldStartClickAndRetry({ action: "click-and-retry", hasAnchor: true })
    ).toBe(true);
    expect(
      shouldStartClickAndRetry({ action: "click-and-retry", hasAnchor: false })
    ).toBe(false);
    expect(
      shouldStartClickAndRetry({ action: "copy-summary", hasAnchor: true })
    ).toBe(false);
    expect(shouldStartClickAndRetry({})).toBe(false);
  });
});

describe("buildClickAndRetryLoadingUrl", () => {
  it("appends the loading suffix to the current href", () => {
    expect(buildClickAndRetryLoadingUrl("https://ex.com/terms")).toBe(
      "https://ex.com/terms (loading content...)"
    );
  });

  it("still suffixes when href is empty or null (historical content.js)", () => {
    expect(buildClickAndRetryLoadingUrl("")).toBe(" (loading content...)");
    expect(buildClickAndRetryLoadingUrl(null)).toBe(" (loading content...)");
  });
});

describe("resolveClickAndRetryPostWaitOutcome", () => {
  it("summarizes when findModalContent returned an element", () => {
    const modalContent = { id: "privacy-modal" };
    expect(resolveClickAndRetryPostWaitOutcome(modalContent)).toEqual({
      action: "summarize_modal_element",
      modalContent,
    });
  });

  it("errors with the fixed message when content is still missing", () => {
    expect(resolveClickAndRetryPostWaitOutcome(null)).toEqual({
      action: "error",
      errorMessage: CONTENT_STILL_NOT_FOUND_MESSAGE,
    });
    expect(resolveClickAndRetryPostWaitOutcome(undefined)).toEqual({
      action: "error",
      errorMessage: CONTENT_STILL_NOT_FOUND_MESSAGE,
    });
    expect(CONTENT_STILL_NOT_FOUND_MESSAGE).toContain("different loading mechanism");
  });
});

describe("CLICK_AND_RETRY_WAIT_MS", () => {
  it("keeps the 1.5s post-click wait used by content.js", () => {
    expect(CLICK_AND_RETRY_WAIT_MS).toBe(1500);
  });
});
