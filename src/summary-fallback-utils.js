/**
 * Pure helper for OpenAI own-key non-JSON fallback summary shape.
 * Used when Pro users fall back to a personal API key and the model
 * returns plain text instead of structured JSON.
 *
 * Dual export: CommonJS for Node/Vitest; globalThis + importScripts for MV3 worker.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestSummaryFallbackUtils = api;
  root.buildFallbackSummary = api.buildFallbackSummary;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /**
   * Build a low-confidence summary object from raw model text.
   * Always returns a complete schema so the popover can render safely.
   */
  function buildFallbackSummary(rawText) {
    const tldr =
      rawText == null ? "" : String(rawText).trim();
    return {
      title: "",
      tldr,
      costs_and_renewal: [],
      cancellation_and_refunds: [],
      liability_and_disputes: [],
      privacy_and_data: [],
      red_flags: [],
      quotes: [],
      confidence: "low",
      _note: "Model did not return valid JSON; showing raw output.",
    };
  }

  return { buildFallbackSummary };
});
