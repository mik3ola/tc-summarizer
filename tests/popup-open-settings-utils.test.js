import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  OPTIONS_PAGE_PATH,
  resolvePopupOpenSettingsAction,
  resolvePopupOpenSettingsFailureFallback,
  shouldShowSafariPermissionTip,
  resolvePopupTouchSummarizeCopy,
} = require("../src/popup-open-settings-utils.js");

describe("resolvePopupOpenSettingsAction", () => {
  it("prefers openOptionsPage when the API exists", () => {
    expect(resolvePopupOpenSettingsAction({ hasOpenOptionsPageApi: true })).toEqual({
      action: "open_options_page",
    });
  });

  it("falls back to background open_options message when API is missing", () => {
    expect(resolvePopupOpenSettingsAction({ hasOpenOptionsPageApi: false })).toEqual({
      action: "send_message",
      messageType: "open_options",
    });
    expect(resolvePopupOpenSettingsAction({})).toEqual({
      action: "send_message",
      messageType: "open_options",
    });
  });
});

describe("resolvePopupOpenSettingsFailureFallback", () => {
  it("uses window.open with the options page path (skips sendMessage retry)", () => {
    expect(resolvePopupOpenSettingsFailureFallback()).toEqual({
      action: "window_open",
      path: OPTIONS_PAGE_PATH,
    });
    expect(OPTIONS_PAGE_PATH).toBe("src/options.html");
  });
});

describe("shouldShowSafariPermissionTip", () => {
  it("shows only for safari-web-extension URLs", () => {
    expect(shouldShowSafariPermissionTip("safari-web-extension://abc/")).toBe(true);
    expect(shouldShowSafariPermissionTip("chrome-extension://abc/")).toBe(false);
    expect(shouldShowSafariPermissionTip("")).toBe(false);
    expect(shouldShowSafariPermissionTip(null)).toBe(false);
  });
});

describe("resolvePopupTouchSummarizeCopy", () => {
  it("returns null on desktop / non-touch", () => {
    expect(resolvePopupTouchSummarizeCopy({ touchSummarize: false })).toBe(null);
    expect(resolvePopupTouchSummarizeCopy({})).toBe(null);
  });

  it("returns popup (US) tap copy on touch-first devices", () => {
    expect(resolvePopupTouchSummarizeCopy({ touchSummarize: true })).toEqual({
      label: "Auto-summarize on tap",
      hint: "Show summary when tapping legal links",
    });
  });
});
