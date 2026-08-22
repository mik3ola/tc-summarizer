// Pure logic for summarize - testable without mocks

export type Summary = {
  title: string;
  tldr: string;
  costs_and_renewal: string[];
  cancellation_and_refunds: string[];
  liability_and_disputes: string[];
  privacy_and_data: string[];
  red_flags: string[];
  quotes: { quote: string; why_it_matters: string }[];
  confidence: "low" | "medium" | "high";
};

export function getMonthlyQuota(plan: string): number {
  if (plan === "pro") return 50;
  if (plan === "enterprise") return 5000;
  return 5;
}

/**
 * Returns the start date of the current 30-day billing period for a user.
 *
 * anchorDate: the user's cycle anchor (signup date for free, upgrade date for Pro)
 * today:      injectable for testing; defaults to now()
 *
 * Example: anchor = "2026-01-20", today = "2026-02-25"
 *   → daysSinceAnchor = 36, periodsElapsed = 1
 *   → currentPeriodStart = "2026-02-19"  (next reset: "2026-03-21")
 */
export function periodStart(anchorDate: string, today = new Date()): string {
  const anchorMs = new Date(anchorDate + "T00:00:00Z").getTime();
  const todayMs = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const msPerPeriod = 30 * 24 * 60 * 60 * 1000;
  const elapsed = Math.max(0, todayMs - anchorMs);
  const periodsElapsed = Math.floor(elapsed / msPerPeriod);
  return new Date(anchorMs + periodsElapsed * msPerPeriod).toISOString().slice(0, 10);
}

export function decodeJwtPayload(token: string): { sub: string; role: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    let payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (payload.length % 4 !== 0) payload += "=";
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export function buildPrompt(url: string, text: string): { system: string; user: string } {
  return {
    system: "You summarize website legal pages (terms, privacy, refund, billing). Be concise, cautious, and highlight potentially costly clauses. If unsure, say so.",
    user: `Summarize this page for a normal user.

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

Page URL: ${url}
Page text:
${text}
`,
  };
}

export function resolvedSiteUrl(envSiteUrl: string | undefined): string {
  return envSiteUrl && !envSiteUrl.includes("localhost")
    ? envSiteUrl
    : "https://termsdigest.com";
}

export type OpenAiChatCompletionBody = {
  model: string;
  temperature: number;
  service_tier: "priority";
  messages: { role: "system" | "user"; content: string }[];
};

/**
 * Chat Completions body for the hosted summarize path.
 * Locks Priority Processing (`service_tier: "priority"`) and temperature —
 * regressions here change latency/cost or drift from the productized prompt.
 * Distinct from extension own-key `buildOpenAiChatCompletionBody` (#43), which
 * does not set service_tier.
 */
export function buildBackendOpenAiChatBody(args: {
  model: string;
  prompt: { system: string; user: string };
}): OpenAiChatCompletionBody {
  return {
    model: args.model,
    temperature: 0.2,
    service_tier: "priority",
    messages: [
      { role: "system", content: args.prompt.system },
      { role: "user", content: args.prompt.user },
    ],
  };
}

/**
 * Extract + parse the assistant JSON summary from a Chat Completions payload.
 * Empty `choices[0].message.content` must fail closed (do not invent a summary).
 * Backend historically uses raw JSON.parse (no markdown-fence stripping) —
 * keep that policy here; client own-key fence handling stays in parse-utils (#18).
 */
export function parseOpenAiSummaryContent(data: unknown): Summary {
  const content = (data as { choices?: { message?: { content?: unknown } }[] })
    ?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content) {
    throw new Error("Empty OpenAI response");
  }
  return JSON.parse(content) as Summary;
}
