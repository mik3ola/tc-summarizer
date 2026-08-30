import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  LEGAL_INTERACTIVE_SELECTOR,
  HIGHLIGHT_SCAN_DEBOUNCE_MS,
  addedNodeMayNeedLegalScan,
  shouldRescanLegalLinksFromMutations,
  shouldInitLinkHighlighting,
  shouldObserveHighlightCandidate,
  buildAddedNodeScanSignal,
} = require("../src/highlight-scan-utils.js");

describe("constants", () => {
  it("locks interactive selector and debounce ms", () => {
    expect(LEGAL_INTERACTIVE_SELECTOR).toBe(
      'a, button, [role="link"], [role="button"]'
    );
    expect(HIGHLIGHT_SCAN_DEBOUNCE_MS).toBe(100);
  });
});

describe("addedNodeMayNeedLegalScan", () => {
  it("requires an element that matches or contains an interactive control", () => {
    expect(addedNodeMayNeedLegalScan(null)).toBe(false);
    expect(addedNodeMayNeedLegalScan({ isElement: false })).toBe(false);
    expect(
      addedNodeMayNeedLegalScan({
        isElement: true,
        matchesInteractive: false,
        hasInteractiveDescendant: false,
      })
    ).toBe(false);
    expect(
      addedNodeMayNeedLegalScan({
        isElement: true,
        matchesInteractive: true,
        hasInteractiveDescendant: false,
      })
    ).toBe(true);
    expect(
      addedNodeMayNeedLegalScan({
        isElement: true,
        matchesInteractive: false,
        hasInteractiveDescendant: true,
      })
    ).toBe(true);
  });
});

describe("shouldRescanLegalLinksFromMutations", () => {
  it("ignores non-childList and text-only additions", () => {
    expect(shouldRescanLegalLinksFromMutations(null)).toBe(false);
    expect(shouldRescanLegalLinksFromMutations([])).toBe(false);
    expect(
      shouldRescanLegalLinksFromMutations([
        { type: "attributes", addedNodes: [{ isElement: true, matchesInteractive: true }] },
      ])
    ).toBe(false);
    expect(
      shouldRescanLegalLinksFromMutations([
        {
          type: "childList",
          addedNodes: [{ isElement: false, matchesInteractive: false }],
        },
      ])
    ).toBe(false);
  });

  it("rescans when an added element may introduce legal interactives", () => {
    expect(
      shouldRescanLegalLinksFromMutations([
        {
          type: "childList",
          addedNodes: [
            { isElement: true, matchesInteractive: false, hasInteractiveDescendant: false },
            { isElement: true, matchesInteractive: false, hasInteractiveDescendant: true },
          ],
        },
      ])
    ).toBe(true);
  });
});

describe("shouldInitLinkHighlighting", () => {
  it("requires UI host, HTML head/body, and autoHover", () => {
    expect(
      shouldInitLinkHighlighting({
        hasUiHost: true,
        hasDocumentHead: true,
        hasDocumentBody: true,
        autoHover: true,
      })
    ).toBe(true);
    expect(
      shouldInitLinkHighlighting({
        hasUiHost: false,
        hasDocumentHead: true,
        hasDocumentBody: true,
        autoHover: true,
      })
    ).toBe(false);
    expect(
      shouldInitLinkHighlighting({
        hasUiHost: true,
        hasDocumentHead: true,
        hasDocumentBody: true,
        autoHover: false,
      })
    ).toBe(false);
    expect(
      shouldInitLinkHighlighting({
        hasUiHost: true,
        hasDocumentHead: false,
        hasDocumentBody: true,
        autoHover: true,
      })
    ).toBe(false);
  });
});

describe("shouldObserveHighlightCandidate", () => {
  it("skips already tracked / classed nodes; requires legal link", () => {
    expect(
      shouldObserveHighlightCandidate({
        alreadyTracked: false,
        hasHighlightClass: false,
        isLegalLink: true,
      })
    ).toBe(true);
    expect(
      shouldObserveHighlightCandidate({
        alreadyTracked: true,
        hasHighlightClass: false,
        isLegalLink: true,
      })
    ).toBe(false);
    expect(
      shouldObserveHighlightCandidate({
        alreadyTracked: false,
        hasHighlightClass: true,
        isLegalLink: true,
      })
    ).toBe(false);
    expect(
      shouldObserveHighlightCandidate({
        alreadyTracked: false,
        hasHighlightClass: false,
        isLegalLink: false,
      })
    ).toBe(false);
  });
});

describe("buildAddedNodeScanSignal", () => {
  it("marks non-elements as non-interactive", () => {
    expect(buildAddedNodeScanSignal(null)).toEqual({
      isElement: false,
      matchesInteractive: false,
      hasInteractiveDescendant: false,
    });
    expect(buildAddedNodeScanSignal({ nodeType: 3 })).toEqual({
      isElement: false,
      matchesInteractive: false,
      hasInteractiveDescendant: false,
    });
  });

  it("uses matches / querySelector against the legal interactive selector", () => {
    const link = {
      nodeType: 1,
      matches: (sel) => sel === LEGAL_INTERACTIVE_SELECTOR,
      querySelector: () => null,
    };
    expect(buildAddedNodeScanSignal(link)).toEqual({
      isElement: true,
      matchesInteractive: true,
      hasInteractiveDescendant: false,
    });

    const wrapper = {
      nodeType: 1,
      matches: () => false,
      querySelector: (sel) => (sel === LEGAL_INTERACTIVE_SELECTOR ? {} : null),
    };
    expect(buildAddedNodeScanSignal(wrapper)).toEqual({
      isElement: true,
      matchesInteractive: false,
      hasInteractiveDescendant: true,
    });
  });
});
