import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  isProForApiAccess,
  isProForUi,
  resolveAccountTier,
} = require("../src/plan-entitlement-utils.js");

describe("isProForApiAccess (strict)", () => {
  it("requires active status AND pro plan", () => {
    expect(isProForApiAccess("active", "pro")).toBe(true);
    expect(isProForApiAccess("active", "free")).toBe(false);
    expect(isProForApiAccess("canceled", "pro")).toBe(false);
    expect(isProForApiAccess("past_due", "pro")).toBe(false);
    expect(isProForApiAccess(null, "pro")).toBe(false);
  });
});

describe("isProForUi (flexible)", () => {
  it("treats plan===pro alone as Pro for UI surfaces", () => {
    expect(isProForUi("active", "pro")).toBe(true);
    expect(isProForUi("canceled", "pro")).toBe(true);
    expect(isProForUi(null, "pro")).toBe(true);
  });

  it("does not treat free plan as Pro", () => {
    expect(isProForUi("active", "free")).toBe(false);
    expect(isProForUi(null, null)).toBe(false);
  });

  it("diverges from API-strict when status is not active", () => {
    expect(isProForUi("canceled", "pro")).toBe(true);
    expect(isProForApiAccess("canceled", "pro")).toBe(false);
  });
});

describe("resolveAccountTier", () => {
  it("returns guest without email", () => {
    expect(resolveAccountTier({})).toBe("guest");
    expect(resolveAccountTier({ email: "", subscription: "active", plan: "pro" })).toBe(
      "guest"
    );
  });

  it("returns pro for flexible Pro entitlement when logged in", () => {
    expect(
      resolveAccountTier({ email: "a@b.com", subscription: "active", plan: "pro" })
    ).toBe("pro");
    expect(
      resolveAccountTier({ email: "a@b.com", subscription: "canceled", plan: "pro" })
    ).toBe("pro");
  });

  it("returns free for logged-in non-Pro", () => {
    expect(
      resolveAccountTier({ email: "a@b.com", subscription: "active", plan: "free" })
    ).toBe("free");
  });
});
