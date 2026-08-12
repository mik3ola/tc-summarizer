import { describe, it, expect } from "vitest";
import {
  PAYMENT_SUCCESS_VERIFY_DELAY_MS,
  PAYMENT_SUCCESS_AUTOCLOSE_DELAY_MS,
  resolvePaymentSuccessBootstrap,
  buildPaymentSuccessPostMessage,
  shouldNotifyOpenerAndAutoClose,
} from "../website/src/lib/payment-success-utils.ts";

describe("resolvePaymentSuccessBootstrap", () => {
  it("treats missing session_id as immediate success", () => {
    expect(resolvePaymentSuccessBootstrap(null)).toEqual({
      initialStatus: "success",
      initialMessage: "Payment successful!",
      deferMs: null,
      deferredSuccessMessage: null,
    });
    expect(resolvePaymentSuccessBootstrap(undefined).initialStatus).toBe("success");
    expect(resolvePaymentSuccessBootstrap("").initialStatus).toBe("success");
  });

  it("defers verification copy when Stripe returns a session_id", () => {
    const result = resolvePaymentSuccessBootstrap("cs_test_123");
    expect(result).toEqual({
      initialStatus: "loading",
      initialMessage: "Verifying your payment...",
      deferMs: PAYMENT_SUCCESS_VERIFY_DELAY_MS,
      deferredSuccessMessage:
        "Payment verified! Your subscription is now active.",
    });
    expect(PAYMENT_SUCCESS_VERIFY_DELAY_MS).toBe(1500);
  });
});

describe("buildPaymentSuccessPostMessage", () => {
  it("locks the historical opener notify payload", () => {
    expect(buildPaymentSuccessPostMessage("cs_test_123")).toEqual({
      type: "payment_success",
      sessionId: "cs_test_123",
    });
    expect(buildPaymentSuccessPostMessage(null)).toEqual({
      type: "payment_success",
      sessionId: null,
    });
  });
});

describe("shouldNotifyOpenerAndAutoClose", () => {
  it("only fires on success with a live opener", () => {
    expect(
      shouldNotifyOpenerAndAutoClose({
        status: "success",
        hasOpener: true,
        openerClosed: false,
      })
    ).toBe(true);
    expect(
      shouldNotifyOpenerAndAutoClose({
        status: "loading",
        hasOpener: true,
        openerClosed: false,
      })
    ).toBe(false);
    expect(
      shouldNotifyOpenerAndAutoClose({
        status: "success",
        hasOpener: false,
        openerClosed: false,
      })
    ).toBe(false);
    expect(
      shouldNotifyOpenerAndAutoClose({
        status: "success",
        hasOpener: true,
        openerClosed: true,
      })
    ).toBe(false);
  });

  it("exports the historical auto-close delay", () => {
    expect(PAYMENT_SUCCESS_AUTOCLOSE_DELAY_MS).toBe(5000);
  });
});
