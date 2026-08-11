/**
 * Pure OpenAI settings normalization for background getSettings() and options form load.
 * Dual export: CommonJS for Node/Vitest; globalThis + importScripts for MV3 worker / pages.
 *
 * Note: background model policy trims and treats whitespace-only as missing;
 * options form field uses `|| "gpt-4o-mini"` (whitespace-only stays as typed). Keep both.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestSettingsUtils = api;
  root.DEFAULT_OPENAI_MODEL = api.DEFAULT_OPENAI_MODEL;
  root.normalizeOpenaiApiKey = api.normalizeOpenaiApiKey;
  root.normalizeOpenaiModel = api.normalizeOpenaiModel;
  root.resolveOptionsOpenaiModelField = api.resolveOptionsOpenaiModelField;
  root.resolveOptionsOpenaiApiKeyField = api.resolveOptionsOpenaiApiKeyField;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

  /** Background: only strings are kept; trimmed; non-strings → "". */
  function normalizeOpenaiApiKey(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  /**
   * Background getSettings model policy:
   * non-empty trimmed string → trimmed value; otherwise DEFAULT_OPENAI_MODEL.
   */
  function normalizeOpenaiModel(value, defaultModel = DEFAULT_OPENAI_MODEL) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    return defaultModel || DEFAULT_OPENAI_MODEL;
  }

  /**
   * Options loadSettings model field: historical `data.openaiModel || "gpt-4o-mini"`.
   * Unlike normalizeOpenaiModel, whitespace-only strings are preserved.
   */
  function resolveOptionsOpenaiModelField(value, defaultModel = DEFAULT_OPENAI_MODEL) {
    return value || defaultModel || DEFAULT_OPENAI_MODEL;
  }

  /** Options loadSettings API key field: historical `data.openaiApiKey || ""`. */
  function resolveOptionsOpenaiApiKeyField(value) {
    return value || "";
  }

  return {
    DEFAULT_OPENAI_MODEL,
    normalizeOpenaiApiKey,
    normalizeOpenaiModel,
    resolveOptionsOpenaiModelField,
    resolveOptionsOpenaiApiKeyField,
  };
});
