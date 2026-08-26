import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  TOUCH_START_HOVER_DELAY_MS,
  resolveTouchStartHoverDelayMs,
  buildClosePopoverSessionPatch,
  closePopoverPreservesNavigationFlags,
  resolvePostSummarizeIsModalContent,
} = require("../src/hover-control-utils.js");

describe("resolveTouchStartHoverDelayMs", () => {
  it("forces an immediate startHover on the touch capture path", () => {
    expect(TOUCH_START_HOVER_DELAY_MS).toBe(0);
    expect(resolveTouchStartHoverDelayMs()).toBe(0);
  });
});

describe("buildClosePopoverSessionPatch", () => {
  it("bumps requestId and clears only anchor/url (cancel inflight)", () => {
    expect(buildClosePopoverSessionPatch(7)).toEqual({
      requestId: 8,
      anchor: null,
      url: null,
      clearHoverTimer: true,
      hidePopover: true,
    });
  });

  it("treats non-finite requestId like 0 (first close still cancels)", () => {
    expect(buildClosePopoverSessionPatch(NaN).requestId).toBe(1);
    expect(buildClosePopoverSessionPatch(undefined).requestId).toBe(1);
    expect(buildClosePopoverSessionPatch(null).requestId).toBe(1);
  });

  it("does not include originalHref or isModalContent in the patch", () => {
    const patch = buildClosePopoverSessionPatch(1);
    expect(patch).not.toHaveProperty("originalHref");
    expect(patch).not.toHaveProperty("isModalContent");
    expect(patch).not.toHaveProperty("lastSummary");
    expect(closePopoverPreservesNavigationFlags()).toBe(true);
  });
});

describe("resolvePostSummarizeIsModalContent", () => {
  it("marks Bootstrap modal and modal-element summaries as modal content", () => {
    expect(resolvePostSummarizeIsModalContent("modal")).toBe(true);
    expect(resolvePostSummarizeIsModalContent("modal_element")).toBe(true);
  });

  it("clears the flag for URL-based summaries (View source opens href)", () => {
    expect(resolvePostSummarizeIsModalContent("url")).toBe(false);
  });

  it("fails closed for unknown sources", () => {
    expect(resolvePostSummarizeIsModalContent("click-to-load")).toBe(false);
    expect(resolvePostSummarizeIsModalContent("")).toBe(false);
    expect(resolvePostSummarizeIsModalContent(undefined)).toBe(false);
  });
});
