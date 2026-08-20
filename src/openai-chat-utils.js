/**
 * Pure helpers for the Pro own-key OpenAI chat.completions path in background.
 * Locks the request body shape (temperature / roles), the shared summarize
 * prompt schema, and empty-content rejection before JSON parse / fallback.
 *
 * Dual export: CommonJS for Node/Vitest; globalThis + importScripts for MV3.
 * Distinct from #28 buildFallbackSummary (post-extract non-JSON shape) and
 * #18 safeJsonParse (markdown-fence JSON cleanup).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestOpenAiChatUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const EMPTY_MODEL_RESPONSE_ERROR = "Empty model response.";
  const DEFAULT_CHAT_TEMPERATURE = 0.2;

  /**
   * Own-key summarize prompt (mirrors backend summarize/lib buildPrompt).
   * system is constant; user is a function of { url, text } for historical parity.
   */
  function buildOwnKeyPrompt() {
    return {
      system:
        "You summarize website legal pages (terms, privacy, refund, billing). Be concise, cautious, and highlight potentially costly clauses. If unsure, say so.",
      user: (input) => `Summarize this page for a normal user.

Requirements:
- Output STRICT JSON only (no markdown, no extra text).
- Be factual; do not invent clauses.
- Focus on costs/renewals, cancellation/refunds/returns/exchanges, liability, arbitration/jurisdiction, data sharing/ads, auto-renew, trials, termination, and unusual restrictions.
- Include a short list of quotes to support the biggest risks.

Return JSON with this schema:
{
  "title": string,
  "tldr": string,
  "costs_and_renewal": string[],
  "cancellation_and_refunds": string[],
  "liability_and_disputes": string[],
  "privacy_and_data": string[],
  "red_flags": string[],
  "quotes": { "quote": string, "why_it_matters": string }[],
  "confidence": "low"|"medium"|"high"
}

Page URL: ${input.url}
Page text:
${input.text}
`,
    };
  }

  /**
   * chat.completions request body for Pro own-key fallback / direct path.
   */
  function buildOpenAiChatCompletionBody({ model, input } = {}) {
    const prompt = buildOwnKeyPrompt();
    return {
      model,
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user(input || { url: "", text: "" }) },
      ],
      temperature: DEFAULT_CHAT_TEMPERATURE,
    };
  }

  /**
   * Extract assistant message content from a chat.completions JSON body.
   * Empty / missing content is rejected with the historical error string.
   *
   * @returns {{ ok: true, content: string } | { ok: false, error: string, content: null }}
   */
  function resolveOpenAiChatContent(data) {
    const outputText = data?.choices?.[0]?.message?.content || "";
    if (!outputText) {
      return { ok: false, error: EMPTY_MODEL_RESPONSE_ERROR, content: null };
    }
    return { ok: true, content: outputText };
  }

  return {
    EMPTY_MODEL_RESPONSE_ERROR,
    DEFAULT_CHAT_TEMPERATURE,
    buildOwnKeyPrompt,
    buildOpenAiChatCompletionBody,
    resolveOpenAiChatContent,
  };
});
