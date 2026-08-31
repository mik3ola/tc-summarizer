import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  resolveFooterRefreshContext,
} = require("../src/footer-refresh-context-utils.js");

describe("resolveFooterRefreshContext", () => {
  it("prefers view-source href over hover session fallback URL", () => {
    expect(
      resolveFooterRefreshContext({
        viewSourceHref: "https://example.com/terms",
        fallbackUrl: "https://example.com/other",
        hasSummaryContent: true,
      })
    ).toEqual({
      currentUrl: "https://example.com/terms",
      isSummaryView: true,
    });
  });

  it("falls back to session URL when view-source is missing/empty", () => {
    expect(
      resolveFooterRefreshContext({
        viewSourceHref: "",
        fallbackUrl: "https://example.com/privacy",
        hasSummaryContent: false,
      })
    ).toEqual({
      currentUrl: "https://example.com/privacy",
      isSummaryView: false,
    });

    expect(
      resolveFooterRefreshContext({
        viewSourceHref: null,
        fallbackUrl: null,
        hasSummaryContent: true,
      })
    ).toEqual({
      currentUrl: null,
      isSummaryView: true,
    });
  });

  it("treats non-string URLs as missing", () => {
    expect(
      resolveFooterRefreshContext({
        viewSourceHref: 42,
        fallbackUrl: { href: "x" },
        hasSummaryContent: 1,
      })
    ).toEqual({
      currentUrl: null,
      isSummaryView: true,
    });
  });

  it("defaults safely when called with no args", () => {
    expect(resolveFooterRefreshContext()).toEqual({
      currentUrl: null,
      isSummaryView: false,
    });
  });
});
