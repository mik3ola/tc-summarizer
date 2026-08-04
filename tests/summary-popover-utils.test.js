import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  TOGGLEABLE_FOOTER_PREFS,
  DEFAULT_LIST_ITEM_CAP,
  DEFAULT_QUOTE_CAP,
  LOADING_TITLE_ADVANCE_MS,
  resolveFooterPrefToggle,
  mergePersistedPreferences,
  normalizeSummaryListItems,
  normalizeSummaryQuotes,
  shouldRenderRedFlagsSection,
  shouldRenderQuotesSection,
  shouldAdvanceLoadingTitle,
  resolvePopoverAction,
} = require("../src/summary-popover-utils.js");

describe("resolveFooterPrefToggle", () => {
  it("toggles only showRedFlags / showQuotes", () => {
    expect(TOGGLEABLE_FOOTER_PREFS).toEqual(["showRedFlags", "showQuotes"]);

    const on = resolveFooterPrefToggle({
      key: "showRedFlags",
      preferences: { showRedFlags: true, showQuotes: true, autoHover: true },
    });
    expect(on).toEqual({
      handled: true,
      nextPreferences: {
        showRedFlags: false,
        showQuotes: true,
        autoHover: true,
      },
      persist: true,
      rerender: true,
      toggledKey: "showRedFlags",
      nextValue: false,
    });

    const off = resolveFooterPrefToggle({
      key: "showQuotes",
      preferences: { showQuotes: false },
    });
    expect(off.nextValue).toBe(true);
    expect(off.nextPreferences.showQuotes).toBe(true);
  });

  it("ignores unknown or missing pref keys without mutating intent", () => {
    const result = resolveFooterPrefToggle({
      key: "autoHover",
      preferences: { autoHover: true, showRedFlags: true },
    });
    expect(result.handled).toBe(false);
    expect(result.persist).toBe(false);
    expect(result.rerender).toBe(false);
    expect(result.nextPreferences.autoHover).toBe(true);
    expect(result.toggledKey).toBe(null);

    expect(
      resolveFooterPrefToggle({ key: null, preferences: {} }).handled
    ).toBe(false);
  });

  it("tolerates missing preferences object", () => {
    const result = resolveFooterPrefToggle({ key: "showRedFlags" });
    expect(result.handled).toBe(true);
    expect(result.nextPreferences.showRedFlags).toBe(true); // !undefined => true
    expect(result.nextValue).toBe(true);
  });
});

describe("mergePersistedPreferences", () => {
  it("merges a single key into stored prefs without dropping siblings", () => {
    expect(
      mergePersistedPreferences(
        { showRedFlags: true, hoverDelay: 750 },
        "showQuotes",
        false
      )
    ).toEqual({
      showRedFlags: true,
      hoverDelay: 750,
      showQuotes: false,
    });
  });

  it("creates an object when storage is empty", () => {
    expect(mergePersistedPreferences(null, "showRedFlags", true)).toEqual({
      showRedFlags: true,
    });
    expect(mergePersistedPreferences(undefined, "showQuotes", false)).toEqual({
      showQuotes: false,
    });
  });
});

describe("normalizeSummaryListItems", () => {
  it("filters non-strings / blank and caps at 6 by default", () => {
    expect(DEFAULT_LIST_ITEM_CAP).toBe(6);
    const items = [
      "a",
      "  ",
      1,
      null,
      "b",
      "c",
      "d",
      "e",
      "f",
      "g",
      "h",
    ];
    expect(normalizeSummaryListItems(items)).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
      "f",
    ]);
    expect(normalizeSummaryListItems(null)).toEqual([]);
    expect(normalizeSummaryListItems("nope")).toEqual([]);
  });

  it("respects a custom positive cap and falls back otherwise", () => {
    expect(normalizeSummaryListItems(["a", "b", "c"], 2)).toEqual(["a", "b"]);
    expect(normalizeSummaryListItems(["a", "b"], 0)).toEqual(["a", "b"]);
    expect(normalizeSummaryListItems(["a", "b", "c"], -1)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});

describe("normalizeSummaryQuotes", () => {
  it("trims, drops empty quotes, and caps at 3", () => {
    expect(DEFAULT_QUOTE_CAP).toBe(3);
    const quotes = [
      { quote: "  Q1  ", why_it_matters: " matter1 " },
      { quote: "", why_it_matters: "ignored" },
      { quote: "Q2" },
      { quote: "Q3", why: "legacy why field" },
      { quote: "Q4", why_it_matters: "too many" },
      null,
      { quote: 12 },
    ];
    expect(normalizeSummaryQuotes(quotes)).toEqual([
      { quote: "Q1", why: "matter1" },
      { quote: "Q2", why: "" },
      { quote: "Q3", why: "legacy why field" },
    ]);
  });

  it("returns empty for non-arrays", () => {
    expect(normalizeSummaryQuotes(null)).toEqual([]);
    expect(normalizeSummaryQuotes({})).toEqual([]);
  });
});

describe("shouldRenderRedFlagsSection / shouldRenderQuotesSection", () => {
  it("requires both preference on and non-empty normalized content", () => {
    expect(shouldRenderRedFlagsSection(true, ["Risk"])).toBe(true);
    expect(shouldRenderRedFlagsSection(false, ["Risk"])).toBe(false);
    expect(shouldRenderRedFlagsSection(true, ["  ", null])).toBe(false);
    expect(shouldRenderRedFlagsSection(true, null)).toBe(false);

    expect(
      shouldRenderQuotesSection(true, [{ quote: "Hello" }])
    ).toBe(true);
    expect(
      shouldRenderQuotesSection(false, [{ quote: "Hello" }])
    ).toBe(false);
    expect(shouldRenderQuotesSection(true, [{ quote: "  " }])).toBe(false);
  });
});

describe("shouldAdvanceLoadingTitle", () => {
  it("advances only from thinking while the loading view is still mounted", () => {
    expect(LOADING_TITLE_ADVANCE_MS).toBe(1700);
    expect(
      shouldAdvanceLoadingTitle({
        currentPhase: "thinking",
        stillOnLoadingView: true,
      })
    ).toBe(true);
    expect(
      shouldAdvanceLoadingTitle({
        currentPhase: "thinking",
        stillOnLoadingView: false,
      })
    ).toBe(false);
    expect(
      shouldAdvanceLoadingTitle({
        currentPhase: "summarizing",
        stillOnLoadingView: true,
      })
    ).toBe(false);
    expect(shouldAdvanceLoadingTitle({})).toBe(false);
  });
});

describe("resolvePopoverAction", () => {
  it("maps known data-action values to stable intents", () => {
    expect(resolvePopoverAction("close-popover")).toEqual({
      handled: true,
      intent: "close_popover",
    });
    expect(resolvePopoverAction("refresh-page").intent).toBe("refresh_page");
    expect(resolvePopoverAction("open-options").intent).toBe("open_options");
    expect(resolvePopoverAction("upgrade-to-pro").intent).toBe(
      "open_options_upgrade"
    );
    expect(resolvePopoverAction("open-support").intent).toBe("open_support");
    expect(resolvePopoverAction("open-link").intent).toBe(
      "open_original_link"
    );
    expect(resolvePopoverAction("copy-summary").intent).toBe("copy_summary");
    expect(resolvePopoverAction("toggle-pref").intent).toBe("toggle_pref");
    expect(resolvePopoverAction("click-and-retry").intent).toBe(
      "click_and_retry"
    );
    expect(resolvePopoverAction("view-source").intent).toBe("view_source");
  });

  it("ignores unknown actions", () => {
    expect(resolvePopoverAction("delete-account")).toEqual({
      handled: false,
      intent: "ignore",
    });
    expect(resolvePopoverAction(null).handled).toBe(false);
    expect(resolvePopoverAction("").handled).toBe(false);
  });
});
