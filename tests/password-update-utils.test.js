import { describe, it, expect } from "vitest";
import {
  resolvePasswordUpdateHttpResult,
  resolvePasswordUpdateNetworkError,
} from "../website/src/lib/password-update-utils.ts";

describe("resolvePasswordUpdateHttpResult", () => {
  it("returns success when response is ok", () => {
    expect(resolvePasswordUpdateHttpResult({ ok: true }, {})).toEqual({
      status: "success",
    });
    expect(resolvePasswordUpdateHttpResult({ ok: true }, null)).toEqual({
      status: "success",
    });
  });

  it("prefers message over error_description on failure", () => {
    expect(
      resolvePasswordUpdateHttpResult(
        { ok: false },
        { message: "from-message", error_description: "from-desc" },
      ),
    ).toEqual({ status: "form_error", message: "from-message" });
  });

  it("falls back to error_description then stable default", () => {
    expect(
      resolvePasswordUpdateHttpResult(
        { ok: false },
        { error_description: "Invalid token" },
      ),
    ).toEqual({ status: "form_error", message: "Invalid token" });

    expect(resolvePasswordUpdateHttpResult({ ok: false }, {})).toEqual({
      status: "form_error",
      message: "Password update failed.",
    });

    expect(resolvePasswordUpdateHttpResult({ ok: false }, null)).toEqual({
      status: "form_error",
      message: "Password update failed.",
    });
  });

  it("keeps empty-string message via ?? (historical page behavior)", () => {
    expect(
      resolvePasswordUpdateHttpResult(
        { ok: false },
        { message: "", error_description: "from-desc" },
      ),
    ).toEqual({ status: "form_error", message: "" });
  });
});

describe("resolvePasswordUpdateNetworkError", () => {
  it("returns the historical network failure copy", () => {
    expect(resolvePasswordUpdateNetworkError()).toEqual({
      status: "form_error",
      message: "Something went wrong. Please try again.",
    });
  });
});
