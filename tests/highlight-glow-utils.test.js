import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  LATE_GLOW_REPLAY_DELAY_MS,
  isRectInViewport,
  shouldPlayGlow,
  shouldReplayLateGlow,
} = require("../src/highlight-glow-utils.js");

describe("LATE_GLOW_REPLAY_DELAY_MS", () => {
  it("is 30 seconds", () => {
    expect(LATE_GLOW_REPLAY_DELAY_MS).toBe(30_000);
  });
});

describe("isRectInViewport", () => {
  const vp = { width: 390, height: 844 };

  it("returns true when the rect intersects the viewport", () => {
    expect(
      isRectInViewport(
        { top: 100, left: 20, bottom: 120, right: 200, width: 180, height: 20 },
        vp
      )
    ).toBe(true);
  });

  it("returns false for zero-size or missing rects", () => {
    expect(isRectInViewport(null, vp)).toBe(false);
    expect(
      isRectInViewport(
        { top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 },
        vp
      )
    ).toBe(false);
  });

  it("returns false when fully outside the viewport", () => {
    expect(
      isRectInViewport(
        { top: 900, left: 10, bottom: 920, right: 100, width: 90, height: 20 },
        vp
      )
    ).toBe(false);
    expect(
      isRectInViewport(
        { top: 10, left: 400, bottom: 30, right: 480, width: 80, height: 20 },
        vp
      )
    ).toBe(false);
  });

  it("allows partial overlap at the edges", () => {
    expect(
      isRectInViewport(
        { top: -10, left: -5, bottom: 10, right: 40, width: 45, height: 20 },
        vp
      )
    ).toBe(true);
  });
});

describe("shouldPlayGlow", () => {
  it("plays only when connected and motion is allowed", () => {
    expect(shouldPlayGlow({ isConnected: true, prefersReducedMotion: false })).toBe(
      true
    );
    expect(shouldPlayGlow({ isConnected: true, prefersReducedMotion: true })).toBe(
      false
    );
    expect(shouldPlayGlow({ isConnected: false, prefersReducedMotion: false })).toBe(
      false
    );
  });
});

describe("shouldReplayLateGlow", () => {
  it("replays only when connected, page visible, and in viewport", () => {
    expect(
      shouldReplayLateGlow({
        isConnected: true,
        pageVisible: true,
        inViewport: true,
      })
    ).toBe(true);
    expect(
      shouldReplayLateGlow({
        isConnected: true,
        pageVisible: false,
        inViewport: true,
      })
    ).toBe(false);
    expect(
      shouldReplayLateGlow({
        isConnected: true,
        pageVisible: true,
        inViewport: false,
      })
    ).toBe(false);
    expect(
      shouldReplayLateGlow({
        isConnected: false,
        pageVisible: true,
        inViewport: true,
      })
    ).toBe(false);
  });
});
