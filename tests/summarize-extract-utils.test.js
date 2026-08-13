import { describe, it, expect } from "vitest";
const {
  MIN_MODAL_TEXT_CHARS,
  resolveFetchHtmlOutcome,
  resolveExtractedTextOutcome,
  resolveSummarizeLinkExtractOutcome,
  resolveModalExtractOutcome,
} = require("../src/summarize-extract-utils.js");

describe("resolveFetchHtmlOutcome", () => {
  it("throws when the extension message itself failed", () => {
    expect(resolveFetchHtmlOutcome({ ok: false, error: "offline" })).toEqual({
      action: "throw",
      errorMessage: "offline",
    });
    expect(resolveFetchHtmlOutcome(null)).toEqual({
      action: "throw",
      errorMessage: "Failed to fetch page HTML.",
    });
  });

  it("throws a blocked-access message when HTTP fetch was not ok", () => {
    expect(
      resolveFetchHtmlOutcome({ ok: true, result: { ok: false, status: 403 } })
    ).toEqual({
      action: "throw",
      errorMessage:
        "Fetch failed (403). This site may block automated access.",
    });
    expect(
      resolveFetchHtmlOutcome({ ok: true, result: { ok: false } }).errorMessage
    ).toContain("Fetch failed (?)");
  });

  it("continues with the HTTP result when fetch succeeded", () => {
    const result = { ok: true, finalUrl: "https://ex.com/final", html: "<p>x</p>" };
    expect(resolveFetchHtmlOutcome({ ok: true, result })).toEqual({
      action: "continue",
      result,
    });
  });
});

describe("resolveExtractedTextOutcome", () => {
  it("maps empty/whitespace extract to UNREADABLE_PAGE", () => {
    expect(resolveExtractedTextOutcome("   \n\t  ")).toEqual({
      action: "throw",
      errorMessage: "UNREADABLE_PAGE",
    });
    expect(resolveExtractedTextOutcome(null).errorMessage).toBe(
      "UNREADABLE_PAGE"
    );
  });

  it("continues with non-empty text", () => {
    expect(resolveExtractedTextOutcome("Plenty of legal text.")).toEqual({
      action: "continue",
      text: "Plenty of legal text.",
    });
  });
});

describe("resolveSummarizeLinkExtractOutcome (combined)", () => {
  it("short-circuits on fetch failure before looking at text", () => {
    expect(
      resolveSummarizeLinkExtractOutcome({
        fetchRes: { ok: false, error: "offline" },
        extractedText: "ignored",
      })
    ).toEqual({ action: "throw", errorMessage: "offline" });
  });

  it("continues with text + finalUrl when both gates pass", () => {
    expect(
      resolveSummarizeLinkExtractOutcome({
        fetchRes: {
          ok: true,
          result: { ok: true, finalUrl: "https://ex.com/final" },
        },
        extractedText: "Plenty of legal text here.",
      })
    ).toEqual({
      action: "continue",
      text: "Plenty of legal text here.",
      finalUrl: "https://ex.com/final",
    });
  });
});

describe("resolveModalExtractOutcome", () => {
  it(`rejects text shorter than ${MIN_MODAL_TEXT_CHARS} chars with kind-specific copy`, () => {
    const short = "x".repeat(MIN_MODAL_TEXT_CHARS - 1);
    expect(resolveModalExtractOutcome(short, "modal")).toEqual({
      ok: false,
      errorMessage: "Modal appears to be empty or has very little content.",
    });
    expect(resolveModalExtractOutcome(short, "modal_element")).toEqual({
      ok: false,
      errorMessage: "Content appears to be empty or has very little text.",
    });
    expect(resolveModalExtractOutcome(null, "modal").ok).toBe(false);
  });

  it("accepts trimmed text at the floor and collapses whitespace", () => {
    const body = "a".repeat(MIN_MODAL_TEXT_CHARS);
    const spaced = `  ${"word ".repeat(20)}  `;
    expect(resolveModalExtractOutcome(body, "modal")).toEqual({
      ok: true,
      text: body,
    });
    const ok = resolveModalExtractOutcome(spaced, "modal_element");
    expect(ok.ok).toBe(true);
    expect(ok.text).not.toMatch(/\s{2,}/);
    expect(ok.text.length).toBeGreaterThanOrEqual(MIN_MODAL_TEXT_CHARS);
  });
});
