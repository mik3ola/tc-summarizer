/**
 * Pure helpers for legal-link highlight glow gating.
 * Locks reduced-motion, viewport, and late-replay policies so a11y /
 * attention cues do not regress on Safari or dense pages.
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for classic content scripts.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestHighlightGlowUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /** Delay before a second two-pulse glow when the link stays on-screen. */
  const LATE_GLOW_REPLAY_DELAY_MS = 30000;

  /**
   * Whether a bounding rect intersects the viewport (positive size required).
   * @param {{ top: number, left: number, bottom: number, right: number, width: number, height: number }|null|undefined} rect
   * @param {{ width: number, height: number }} viewport
   */
  function isRectInViewport(rect, viewport) {
    if (!rect) return false;
    if (rect.width <= 0 || rect.height <= 0) return false;
    const vpW = viewport?.width ?? 0;
    const vpH = viewport?.height ?? 0;
    return (
      rect.bottom >= 0 &&
      rect.right >= 0 &&
      rect.top <= vpH &&
      rect.left <= vpW
    );
  }

  /**
   * Initial glow: skip when disconnected or user prefers reduced motion.
   */
  function shouldPlayGlow({ isConnected = false, prefersReducedMotion = false } = {}) {
    return !!(isConnected && !prefersReducedMotion);
  }

  /**
   * Late 30s replay: only when the tab is visible and the link is still in view.
   */
  function shouldReplayLateGlow({
    isConnected = false,
    pageVisible = false,
    inViewport = false,
  } = {}) {
    return !!(isConnected && pageVisible && inViewport);
  }

  return {
    LATE_GLOW_REPLAY_DELAY_MS,
    isRectInViewport,
    shouldPlayGlow,
    shouldReplayLateGlow,
  };
});
