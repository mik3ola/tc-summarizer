import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { computePopoverPosition } = require("../src/popover-position-utils.js");

describe("computePopoverPosition", () => {
  it("places the popover to the right/below the anchor by default", () => {
    const pos = computePopoverPosition({
      anchorRect: { left: 100, top: 80, width: 60, height: 20 },
      popWidth: 300,
      popHeight: 200,
      viewportWidth: 1200,
      viewportHeight: 800,
    });
    // left = 100 + min(60,40) + 12 = 152; top = 80 + 20 + 10 = 110
    expect(pos).toEqual({ left: 152, top: 110 });
  });

  it("flips to the left when the right side overflows", () => {
    const pos = computePopoverPosition({
      anchorRect: { left: 900, top: 100, width: 50, height: 20 },
      popWidth: 400,
      popHeight: 150,
      viewportWidth: 1000,
      viewportHeight: 800,
    });
    // desiredLeft overflows; left = 900 - 400 - 12 = 488
    expect(pos.left).toBe(488);
    expect(pos.top).toBe(130);
  });

  it("clamps so the right edge stays in-bounds when the popover is wider than the viewport", () => {
    const pos = computePopoverPosition({
      anchorRect: { left: 40, top: 40, width: 20, height: 16 },
      popWidth: 380,
      popHeight: 120,
      viewportWidth: 360,
      viewportHeight: 640,
      padding: 10,
    });
    // Final clamp: left = vpW - popWidth - padding (may be negative on tiny viewports)
    expect(pos.left).toBe(360 - 380 - 10);
    expect(pos.left + 380).toBe(360 - 10);
  });

  it("flips above when the bottom overflows", () => {
    const pos = computePopoverPosition({
      anchorRect: { left: 50, top: 700, width: 40, height: 20 },
      popWidth: 280,
      popHeight: 200,
      viewportWidth: 800,
      viewportHeight: 750,
    });
    // top = 700 - 200 - 10 = 490
    expect(pos.top).toBe(490);
  });

  it("clamps so the bottom edge stays in-bounds when taller than the viewport", () => {
    const pos = computePopoverPosition({
      anchorRect: { left: 20, top: 10, width: 30, height: 14 },
      popWidth: 200,
      popHeight: 900,
      viewportWidth: 400,
      viewportHeight: 500,
      padding: 10,
    });
    // Final clamp prioritizes keeping the bottom edge inside the padded viewport
    expect(pos.top).toBe(500 - 900 - 10);
    expect(pos.top + 900).toBe(500 - 10);
  });
});
