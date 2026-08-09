import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  isFlexibleProPlan,
  resolveCheckoutPollOutcome,
  resolveUpgradeDeepLinkFollowUp,
} = require("../src/checkout-poll-utils.js");

describe("isFlexibleProPlan", () => {
  it("treats plan=pro alone as Pro (flexible checkout activation)", () => {
    expect(isFlexibleProPlan({ subscription: "past_due", subscriptionPlan: "pro" })).toBe(true);
    expect(isFlexibleProPlan({ subscription: null, subscriptionPlan: "pro" })).toBe(true);
  });

  it("accepts active+pro", () => {
    expect(isFlexibleProPlan({ subscription: "active", subscriptionPlan: "pro" })).toBe(true);
  });

  it("rejects free/guest plans", () => {
    expect(isFlexibleProPlan({ subscription: "active", subscriptionPlan: "free" })).toBe(false);
    expect(isFlexibleProPlan({ subscription: null, subscriptionPlan: null })).toBe(false);
  });
});

describe("resolveCheckoutPollOutcome", () => {
  it("returns activated when flexible Pro is detected", () => {
    expect(
      resolveCheckoutPollOutcome({
        subscription: null,
        subscriptionPlan: "pro",
        pollCount: 1,
        maxPolls: 20,
      })
    ).toBe("activated");
  });

  it("returns continue while Pro is not active and polls remain", () => {
    expect(
      resolveCheckoutPollOutcome({
        subscription: "active",
        subscriptionPlan: "free",
        pollCount: 5,
        maxPolls: 20,
      })
    ).toBe("continue");
  });

  it("returns exhausted at max polls without Pro (info modal, not error)", () => {
    expect(
      resolveCheckoutPollOutcome({
        subscription: null,
        subscriptionPlan: "free",
        pollCount: 20,
        maxPolls: 20,
      })
    ).toBe("exhausted");

    expect(
      resolveCheckoutPollOutcome({
        subscription: null,
        subscriptionPlan: null,
        pollCount: 21,
        maxPolls: 20,
      })
    ).toBe("exhausted");
  });

  it("prefers activated over exhausted when Pro lands on the final poll", () => {
    expect(
      resolveCheckoutPollOutcome({
        subscription: "active",
        subscriptionPlan: "pro",
        pollCount: 20,
        maxPolls: 20,
      })
    ).toBe("activated");
  });
});

describe("resolveUpgradeDeepLinkFollowUp", () => {
  it("clicks upgrade when an access_token is present", () => {
    expect(
      resolveUpgradeDeepLinkFollowUp({ access_token: "tok_abc", user: { email: "a@b.c" } })
    ).toBe("click_upgrade");
  });

  it("shows sign-in modal for missing session or token", () => {
    expect(resolveUpgradeDeepLinkFollowUp(null)).toBe("show_signin_modal");
    expect(resolveUpgradeDeepLinkFollowUp({})).toBe("show_signin_modal");
    expect(resolveUpgradeDeepLinkFollowUp({ access_token: "" })).toBe("show_signin_modal");
  });
});
