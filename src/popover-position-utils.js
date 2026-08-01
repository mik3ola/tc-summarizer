/**
 * Pure helpers for summary popover viewport clamping.
 * Keeps the popover fully visible near a legal-link anchor across
 * narrow viewports (iOS Safari) and large popover content.
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for classic content scripts.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestPopoverPositionUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /**
   * Compute popover top-left so it stays within the viewport near an anchor.
   * Preference order: right/below → flip left/above → clamp into padding.
   *
   * @param {{
   *   anchorRect: { left: number, top: number, width: number, height: number },
   *   popWidth: number,
   *   popHeight: number,
   *   viewportWidth: number,
   *   viewportHeight: number,
   *   padding?: number,
   * }} opts
   * @returns {{ left: number, top: number }}
   */
  function computePopoverPosition({
    anchorRect,
    popWidth,
    popHeight,
    viewportWidth,
    viewportHeight,
    padding = 10,
  }) {
    const rect = anchorRect || { left: 0, top: 0, width: 0, height: 0 };
    const vpW = Number(viewportWidth) || 0;
    const vpH = Number(viewportHeight) || 0;
    const width = Number(popWidth) || 0;
    const height = Number(popHeight) || 0;
    const pad = Number.isFinite(padding) ? padding : 10;

    // default right/below the link
    let left = rect.left + Math.min(rect.width, 40) + 12;
    let top = rect.top + rect.height + 10;

    if (left + width > vpW - pad) {
      // Doesn't fit on right, try left side
      left = rect.left - width - 12;
      if (left < pad) {
        left = Math.max(pad, vpW - width - pad);
      }
    }

    if (left < pad) {
      left = pad;
    }

    if (top + height > vpH - pad) {
      // Doesn't fit below, try above
      top = rect.top - height - 10;
      if (top < pad) {
        top = Math.max(pad, vpH - height - pad);
      }
    }

    if (top < pad) {
      top = pad;
    }

    // Final check: ensure both edges are within bounds
    if (left + width > vpW - pad) {
      left = vpW - width - pad;
    }
    if (top + height > vpH - pad) {
      top = vpH - height - pad;
    }

    return { left, top };
  }

  return { computePopoverPosition };
});
