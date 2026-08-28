import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  IFRAME_LEGAL_MIN_LENGTH,
  resolveIframeDocument,
  isAcceptableIframeLegalBodyText,
  buildIframeBodySignal,
  resolveSameOriginIframeLegalBody,
} = require("../src/iframe-legal-utils.js");

const KEYWORDS = ["terms", "privacy", "cookie policy"];

describe("IFRAME_LEGAL_MIN_LENGTH", () => {
  it("locks the historical >200 floor", () => {
    expect(IFRAME_LEGAL_MIN_LENGTH).toBe(200);
  });
});

describe("resolveIframeDocument", () => {
  it("prefers contentDocument over contentWindow.document", () => {
    const viaContent = { id: "contentDocument" };
    const viaWindow = { id: "contentWindow" };
    expect(resolveIframeDocument(viaContent, viaWindow)).toBe(viaContent);
    expect(resolveIframeDocument(null, viaWindow)).toBe(viaWindow);
    expect(resolveIframeDocument(undefined, viaWindow)).toBe(viaWindow);
  });

  it("returns null when neither document is available", () => {
    expect(resolveIframeDocument(null, null)).toBe(null);
    expect(resolveIframeDocument(undefined, undefined)).toBe(null);
  });
});

describe("isAcceptableIframeLegalBodyText", () => {
  it("accepts keyword-rich text longer than the floor", () => {
    const body = `${"x".repeat(190)} privacy policy here`;
    expect(body.length).toBeGreaterThan(200);
    expect(isAcceptableIframeLegalBodyText(body, KEYWORDS)).toBe(true);
  });

  it("rejects short keyword text and long non-keyword text", () => {
    expect(isAcceptableIframeLegalBodyText("privacy policy", KEYWORDS)).toBe(
      false
    );
    expect(
      isAcceptableIframeLegalBodyText("x".repeat(250) + " hello", KEYWORDS)
    ).toBe(false);
  });

  it("uses strict greater-than length (exactly 200 fails)", () => {
    const exact = "privacy" + "y".repeat(200 - "privacy".length);
    expect(exact.length).toBe(200);
    expect(isAcceptableIframeLegalBodyText(exact, KEYWORDS)).toBe(false);
    expect(isAcceptableIframeLegalBodyText(exact + "!", KEYWORDS)).toBe(true);
  });

  it("lowercases before matching and does not trim for length", () => {
    const spaced = " ".repeat(201) + "TERMS";
    expect(isAcceptableIframeLegalBodyText(spaced, KEYWORDS)).toBe(true);
    expect(
      isAcceptableIframeLegalBodyText("x".repeat(250) + " TERMS", ["terms"])
    ).toBe(true);
  });

  it("rejects empty keywords / nullish text", () => {
    expect(isAcceptableIframeLegalBodyText("x".repeat(250) + " terms", [])).toBe(
      false
    );
    expect(isAcceptableIframeLegalBodyText(null, KEYWORDS)).toBe(false);
    expect(isAcceptableIframeLegalBodyText("", KEYWORDS)).toBe(false);
  });
});

describe("buildIframeBodySignal", () => {
  it("marks accessible frames and copies body text", () => {
    const body = { textContent: "terms of service " + "z".repeat(200) };
    const signal = buildIframeBodySignal({ doc: { body } });
    expect(signal.accessible).toBe(true);
    expect(signal.body).toBe(body);
    expect(signal.bodyText).toContain("terms of service");
  });

  it("uses empty bodyText when body is missing", () => {
    expect(buildIframeBodySignal({ doc: { body: null } })).toEqual({
      accessible: true,
      bodyText: "",
      body: null,
    });
  });

  it("marks access errors and null docs as inaccessible", () => {
    expect(buildIframeBodySignal({ accessError: true })).toEqual({
      accessible: false,
      bodyText: "",
      body: null,
    });
    expect(buildIframeBodySignal({ doc: null })).toEqual({
      accessible: false,
      bodyText: "",
      body: null,
    });
  });
});

describe("resolveSameOriginIframeLegalBody", () => {
  it("returns the first accessible keyword-rich iframe body", () => {
    const bodyA = { id: "short" };
    const bodyB = { id: "legal" };
    const bodyC = { id: "later" };
    const hit = resolveSameOriginIframeLegalBody(
      [
        { accessible: true, bodyText: "privacy", body: bodyA },
        {
          accessible: true,
          bodyText: "x".repeat(210) + " privacy policy",
          body: bodyB,
        },
        {
          accessible: true,
          bodyText: "x".repeat(210) + " terms",
          body: bodyC,
        },
      ],
      KEYWORDS
    );
    expect(hit?.body).toBe(bodyB);
  });

  it("skips inaccessible / cross-origin frames", () => {
    const body = { id: "ok" };
    const hit = resolveSameOriginIframeLegalBody(
      [
        { accessible: false, bodyText: "x".repeat(210) + " terms", body: null },
        {
          accessible: true,
          bodyText: "x".repeat(210) + " cookie policy",
          body,
        },
      ],
      KEYWORDS
    );
    expect(hit?.body).toBe(body);
  });

  it("returns null when nothing qualifies", () => {
    expect(resolveSameOriginIframeLegalBody([], KEYWORDS)).toBe(null);
    expect(
      resolveSameOriginIframeLegalBody(
        [{ accessible: true, bodyText: "short terms", body: {} }],
        KEYWORDS
      )
    ).toBe(null);
    expect(resolveSameOriginIframeLegalBody(null, KEYWORDS)).toBe(null);
  });
});
