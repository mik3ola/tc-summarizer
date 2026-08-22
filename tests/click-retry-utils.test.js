import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  CLICK_RETRY_WAIT_MS,
  CLICK_RETRY_NOT_FOUND_MESSAGE,
  resolveClickAndRetryAfterWait,
} = require("../src/click-retry-utils.js");

describe("resolveClickAndRetryAfterWait", () => {
  it("summarizes the discovered modal element after the post-click wait", () => {
    const modal = { className: "legal-modal" };
    expect(resolveClickAndRetryAfterWait(modal)).toEqual({
      action: "summarize_modal_element",
      modalContent: modal,
    });
  });

  it("returns the fixed not-found error when discovery still fails", () => {
    expect(resolveClickAndRetryAfterWait(null)).toEqual({
      action: "error",
      errorMessage: CLICK_RETRY_NOT_FOUND_MESSAGE,
    });
    expect(resolveClickAndRetryAfterWait(undefined)).toEqual({
      action: "error",
      errorMessage: CLICK_RETRY_NOT_FOUND_MESSAGE,
    });
    expect(CLICK_RETRY_NOT_FOUND_MESSAGE).toContain("Content still not found");
    expect(CLICK_RETRY_NOT_FOUND_MESSAGE).toContain("different loading mechanism");
  });

  it("preserves the historical 1.5s wait constant", () => {
    expect(CLICK_RETRY_WAIT_MS).toBe(1500);
  });
});
