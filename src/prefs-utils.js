/**
 * Pure preference helpers shared by options form load/save and content-script
 * storage patches. Defaults are opt-out (`!== false`); string booleans from
 * storage must coerce before driving UI / hover delay.
 *
 * Dual export: CommonJS for Node/Vitest; globalThis for classic scripts.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestPrefsUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const DEFAULT_HOVER_DELAY = "750";
  const BOOL_PREF_KEYS = ["autoHover", "showRedFlags", "showQuotes", "enableCaching"];

  /**
   * Coerce checkbox prefs if storage ever has strings ("true"/"false").
   * Non-object patches yield {}.
   */
  function normalizePrefsPatch(patch) {
    if (!patch || typeof patch !== "object") return {};
    const out = { ...patch };
    for (const key of BOOL_PREF_KEYS) {
      if (Object.prototype.hasOwnProperty.call(out, key)) {
        const v = out[key];
        if (v === true || v === "true") out[key] = true;
        else if (v === false || v === "false") out[key] = false;
      }
    }
    return out;
  }

  /**
   * Options form checkbox/select values from stored preferences.
   * Missing / null boolean prefs default ON; hover delay defaults to "750".
   */
  function resolveFormPreferenceValues(prefs) {
    const p = prefs && typeof prefs === "object" ? prefs : {};
    return {
      autoHover: p.autoHover !== false,
      showRedFlags: p.showRedFlags !== false,
      showQuotes: p.showQuotes !== false,
      enableCaching: p.enableCaching !== false,
      hoverDelay: p.hoverDelay || DEFAULT_HOVER_DELAY,
    };
  }

  /**
   * Persistable preferences object from options form control values.
   */
  function buildPreferencesFromForm({
    autoHover,
    showRedFlags,
    showQuotes,
    enableCaching,
    hoverDelay,
  } = {}) {
    return {
      autoHover: !!autoHover,
      showRedFlags: !!showRedFlags,
      showQuotes: !!showQuotes,
      enableCaching: !!enableCaching,
      hoverDelay: hoverDelay || DEFAULT_HOVER_DELAY,
    };
  }

  /**
   * Merge a storage/message patch into the in-memory preferences object
   * (content script load + onChanged paths).
   */
  function mergeNormalizedPreferences(base, patch) {
    const safeBase =
      base && typeof base === "object" ? { ...base } : {};
    return { ...safeBase, ...normalizePrefsPatch(patch) };
  }

  return {
    BOOL_PREF_KEYS,
    DEFAULT_HOVER_DELAY,
    normalizePrefsPatch,
    resolveFormPreferenceValues,
    buildPreferencesFromForm,
    mergeNormalizedPreferences,
  };
});
