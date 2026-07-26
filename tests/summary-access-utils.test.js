import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  resolveSummaryApiAccess,
  isQuotaExceededError,
} = require("../src/summary-access-utils.js");

describe("resolveSummaryApiAccess", () => {
  it("requires backend for free users even with an API key", () => {
    const access = resolveSummaryApiAccess({
      hasOwnApiKey: true,
      subscription: "active",
      subscriptionPlan: "free",
      hasBackendAccess: true,
    });
    expect(access.isPro).toBe(false);
    expect(access.shouldTryBackendFirst).toBe(true);
    expect(access.canFallbackToOwnKey).toBe(false);
    expect(access.canSummarize).toBe(true);
  });

  it("allows Pro users to fall back to their own API key", () => {
    const access = resolveSummaryApiAccess({
      hasOwnApiKey: true,
      subscription: "active",
      subscriptionPlan: "pro",
      hasBackendAccess: true,
    });
    expect(access.isPro).toBe(true);
    expect(access.shouldTryBackendFirst).toBe(true);
    expect(access.canFallbackToOwnKey).toBe(true);
    expect(access.canSummarize).toBe(true);
  });

  it("does not treat canceled Pro as Pro for own-key fallback", () => {
    const access = resolveSummaryApiAccess({
      hasOwnApiKey: true,
      subscription: "canceled",
      subscriptionPlan: "pro",
      hasBackendAccess: true,
    });
    expect(access.isPro).toBe(false);
    expect(access.canFallbackToOwnKey).toBe(false);
  });

  it("blocks summarize when neither backend nor Pro own-key path exists", () => {
    const access = resolveSummaryApiAccess({
      hasOwnApiKey: true,
      subscription: "active",
      subscriptionPlan: "free",
      hasBackendAccess: false,
    });
    expect(access.canSummarize).toBe(false);
    expect(access.shouldTryBackendFirst).toBe(false);
    expect(access.canFallbackToOwnKey).toBe(false);
  });

  it("lets Pro own-key work when backend access is missing", () => {
    const access = resolveSummaryApiAccess({
      hasOwnApiKey: true,
      subscription: "active",
      subscriptionPlan: "pro",
      hasBackendAccess: false,
    });
    expect(access.shouldTryBackendFirst).toBe(false);
    expect(access.canFallbackToOwnKey).toBe(true);
    expect(access.canSummarize).toBe(true);
  });
});

describe("isQuotaExceededError", () => {
  it("detects quotaExceeded flag, 429 status, and message text", () => {
    expect(isQuotaExceededError({ quotaExceeded: true })).toBe(true);
    expect(isQuotaExceededError({ status: 429 })).toBe(true);
    expect(isQuotaExceededError(new Error("Quota exceeded for plan"))).toBe(true);
    expect(isQuotaExceededError({ message: "monthly quota exceeded" })).toBe(true);
  });

  it("rejects unrelated errors", () => {
    expect(isQuotaExceededError(null)).toBe(false);
    expect(isQuotaExceededError(new Error("Invalid JWT"))).toBe(false);
    expect(isQuotaExceededError({ status: 500 })).toBe(false);
  });
});
