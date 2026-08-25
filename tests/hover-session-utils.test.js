import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  IN_PAGE_MODAL_LOADING_SUFFIX,
  IN_PAGE_CONTENT_LOADING_SUFFIX,
  resolveHoverSessionFields,
  buildInPageModalLoadingUrl,
  buildInPageContentLoadingUrl,
} = require("../src/hover-session-utils.js");

describe("resolveHoverSessionFields", () => {
  const pageHref = "https://shop.example/checkout";

  it("rejects missing or untyped linkInfo", () => {
    expect(resolveHoverSessionFields(null, { pageHref })).toEqual({
      ok: false,
      reason: "invalid_link_info",
    });
    expect(resolveHoverSessionFields({}, { pageHref })).toEqual({
      ok: false,
      reason: "invalid_link_info",
    });
  });

  it("builds modal session URL as pageHref + selector without touching isModalContent", () => {
    const result = resolveHoverSessionFields(
      { type: "modal", value: "#termsModal" },
      { pageHref }
    );
    expect(result).toEqual({
      ok: true,
      url: "https://shop.example/checkout#termsModal",
    });
    expect(result).not.toHaveProperty("setIsModalContent");
  });

  it("uses bare pageHref for modal-element without setting isModalContent", () => {
    const result = resolveHoverSessionFields(
      { type: "modal-element", value: {} },
      { pageHref }
    );
    expect(result).toEqual({ ok: true, url: pageHref });
    expect(result).not.toHaveProperty("setIsModalContent");
  });

  it("marks click-to-load as modal content and uses pageHref", () => {
    expect(
      resolveHoverSessionFields({ type: "click-to-load", value: {} }, { pageHref })
    ).toEqual({
      ok: true,
      url: pageHref,
      setIsModalContent: true,
    });
  });

  it("resolves absolute URL targets and fails closed when unresolvable", () => {
    const resolveAbsoluteUrl = (href) =>
      href === "/privacy" ? "https://shop.example/privacy" : null;

    expect(
      resolveHoverSessionFields(
        { type: "url", value: "/privacy" },
        { pageHref, resolveAbsoluteUrl }
      )
    ).toEqual({ ok: true, url: "https://shop.example/privacy" });

    expect(
      resolveHoverSessionFields(
        { type: "url", value: "javascript:void(0)" },
        { pageHref, resolveAbsoluteUrl }
      )
    ).toEqual({ ok: false, reason: "unresolvable_url" });

    expect(
      resolveHoverSessionFields({ type: "url", value: "/privacy" }, { pageHref })
    ).toEqual({ ok: false, reason: "unresolvable_url" });
  });

  it("ignores unknown linkInfo types", () => {
    expect(
      resolveHoverSessionFields({ type: "dynamic", value: "x" }, { pageHref })
    ).toEqual({ ok: false, reason: "unknown_type" });
  });

  it("stringifies nullish pageHref like historical concatenation", () => {
    expect(
      resolveHoverSessionFields(
        { type: "modal", value: "#legal" },
        { pageHref: null }
      )
    ).toEqual({ ok: true, url: "#legal" });
  });
});

describe("buildInPage*LoadingUrl", () => {
  it("appends the historical modal / content loading suffixes", () => {
    expect(IN_PAGE_MODAL_LOADING_SUFFIX).toBe(" (in-page modal)");
    expect(IN_PAGE_CONTENT_LOADING_SUFFIX).toBe(" (in-page content)");

    expect(buildInPageModalLoadingUrl("https://example.com/app")).toBe(
      "https://example.com/app (in-page modal)"
    );
    expect(buildInPageContentLoadingUrl("https://example.com/app")).toBe(
      "https://example.com/app (in-page content)"
    );
  });

  it("tolerates empty page href", () => {
    expect(buildInPageModalLoadingUrl("")).toBe(" (in-page modal)");
    expect(buildInPageContentLoadingUrl(null)).toBe(" (in-page content)");
  });
});
