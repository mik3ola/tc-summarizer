/**
 * Pure helpers for summary popover interactions: footer pref toggles,
 * preference-gated sections, list/quote normalization, loading-title phase,
 * and popover button action routing.
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for classic content scripts.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestSummaryPopoverUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const TOGGLEABLE_FOOTER_PREFS = ["showRedFlags", "showQuotes"];
  const DEFAULT_LIST_ITEM_CAP = 6;
  const DEFAULT_QUOTE_CAP = 3;
  const LOADING_TITLE_ADVANCE_MS = 1700;

  /**
   * Footer chip toggles only allow showRedFlags / showQuotes.
   * Returns next preference values + whether to persist and re-render.
   */
  function resolveFooterPrefToggle({ key, preferences } = {}) {
    if (!TOGGLEABLE_FOOTER_PREFS.includes(key)) {
      return {
        handled: false,
        nextPreferences: preferences && typeof preferences === "object" ? { ...preferences } : {},
        persist: false,
        rerender: false,
        toggledKey: null,
        nextValue: null,
      };
    }

    const base =
      preferences && typeof preferences === "object" ? { ...preferences } : {};
    const nextValue = !base[key];
    base[key] = nextValue;

    return {
      handled: true,
      nextPreferences: base,
      persist: true,
      rerender: true,
      toggledKey: key,
      nextValue,
    };
  }

  /**
   * Merge a single toggled pref into the stored preferences object
   * (same shape options.js / chrome.storage.local uses).
   */
  function mergePersistedPreferences(storedPreferences, key, value) {
    const saved =
      storedPreferences && typeof storedPreferences === "object"
        ? { ...storedPreferences }
        : {};
    saved[key] = value;
    return saved;
  }

  /**
   * Normalize bullet list items for summary sections (non-empty strings, capped).
   */
  function normalizeSummaryListItems(items, maxItems = DEFAULT_LIST_ITEM_CAP) {
    const arr = Array.isArray(items)
      ? items.filter((x) => typeof x === "string" && x.trim())
      : [];
    const limit =
      typeof maxItems === "number" && Number.isFinite(maxItems) && maxItems > 0
        ? Math.floor(maxItems)
        : DEFAULT_LIST_ITEM_CAP;
    return arr.slice(0, limit);
  }

  /**
   * Normalize quote objects for the supporting-quotes section (capped).
   */
  function normalizeSummaryQuotes(quotes, maxQuotes = DEFAULT_QUOTE_CAP) {
    const arr = Array.isArray(quotes) ? quotes : [];
    const cleaned = arr
      .map((q) => ({
        quote: typeof q?.quote === "string" ? q.quote.trim() : "",
        why:
          typeof q?.why_it_matters === "string"
            ? q.why_it_matters.trim()
            : typeof q?.why === "string"
              ? q.why.trim()
              : "",
      }))
      .filter((q) => q.quote);
    const limit =
      typeof maxQuotes === "number" && Number.isFinite(maxQuotes) && maxQuotes > 0
        ? Math.floor(maxQuotes)
        : DEFAULT_QUOTE_CAP;
    return cleaned.slice(0, limit);
  }

  /** Preference gate for the red-flags section (also requires non-empty items). */
  function shouldRenderRedFlagsSection(showRedFlags, items) {
    return !!showRedFlags && normalizeSummaryListItems(items).length > 0;
  }

  /** Preference gate for supporting quotes (also requires at least one quote). */
  function shouldRenderQuotesSection(showQuotes, quotes) {
    return !!showQuotes && normalizeSummaryQuotes(quotes).length > 0;
  }

  /**
   * Loading title strip: Thinking → Summarising after a fixed delay,
   * only while still on the thinking phase (summary not yet rendered).
   */
  function shouldAdvanceLoadingTitle({
    currentPhase = null,
    stillOnLoadingView = false,
  } = {}) {
    return stillOnLoadingView && currentPhase === "thinking";
  }

  /**
   * Map popover button/link data-action values to a stable intent.
   * Unknown actions are ignored so new UI chrome cannot fire the wrong path.
   */
  function resolvePopoverAction(action) {
    switch (action) {
      case "close-popover":
        return { handled: true, intent: "close_popover" };
      case "refresh-page":
        return { handled: true, intent: "refresh_page" };
      case "open-options":
        return { handled: true, intent: "open_options" };
      case "upgrade-to-pro":
        return { handled: true, intent: "open_options_upgrade" };
      case "open-support":
        return { handled: true, intent: "open_support" };
      case "open-link":
        return { handled: true, intent: "open_original_link" };
      case "copy-summary":
        return { handled: true, intent: "copy_summary" };
      case "toggle-pref":
        return { handled: true, intent: "toggle_pref" };
      case "click-and-retry":
        return { handled: true, intent: "click_and_retry" };
      case "view-source":
        return { handled: true, intent: "view_source" };
      default:
        return { handled: false, intent: "ignore" };
    }
  }

  return {
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
  };
});
