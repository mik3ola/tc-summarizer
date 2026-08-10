import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { canInjectUiHost, buildUiHostStub } = require("../src/ui-host-utils.js");

class FakeHTMLElement {}
class FakeSVGElement {}

describe("canInjectUiHost", () => {
  it("allows HTML documents with a body", () => {
    const doc = {
      body: {},
      documentElement: new FakeHTMLElement(),
    };
    expect(canInjectUiHost(doc, FakeHTMLElement)).toBe(true);
  });

  it("rejects missing body (SVG / image viewers)", () => {
    const doc = {
      body: null,
      documentElement: new FakeHTMLElement(),
    };
    expect(canInjectUiHost(doc, FakeHTMLElement)).toBe(false);
    expect(canInjectUiHost(null, FakeHTMLElement)).toBe(false);
    expect(canInjectUiHost(undefined, FakeHTMLElement)).toBe(false);
  });

  it("rejects non-HTML documentElement (standalone SVG root)", () => {
    const doc = {
      body: {},
      documentElement: new FakeSVGElement(),
    };
    expect(canInjectUiHost(doc, FakeHTMLElement)).toBe(false);
  });

  it("rejects when HTMLElement ctor is unavailable", () => {
    const doc = {
      body: {},
      documentElement: new FakeHTMLElement(),
    };
    expect(canInjectUiHost(doc, null)).toBe(false);
  });

  it("returns false when instanceof access throws", () => {
    const doc = {
      body: {},
      get documentElement() {
        throw new Error("hostile document");
      },
    };
    expect(canInjectUiHost(doc, FakeHTMLElement)).toBe(false);
  });
});

describe("buildUiHostStub", () => {
  it("returns a null host with no-op popover listeners", () => {
    const stub = buildUiHostStub();
    expect(stub.host).toBe(null);
    expect(stub.shadow).toBe(null);
    expect(() => stub.popover.addEventListener("click", () => {})).not.toThrow();
    expect(() => stub.popover.removeEventListener("click", () => {})).not.toThrow();
  });

  it("returns a fresh stub each call", () => {
    const a = buildUiHostStub();
    const b = buildUiHostStub();
    expect(a).not.toBe(b);
    expect(a.popover).not.toBe(b.popover);
  });
});
