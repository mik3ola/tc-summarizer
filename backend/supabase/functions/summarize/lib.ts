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

/** Extract authenticated user id from a Bearer Authorization header. */
export function extractUserIdFromAuthHeader(authHeader: string | null | undefined): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const payload = decodeJwtPayload(authHeader.replace("Bearer ", ""));
  return payload?.sub ?? null;
}

/** Validate summarize POST body; returns null when url or text is missing. */
export function parseSummarizeRequestBody(
  body: unknown,
): { url: string; text: string } | null {
  const b = body as { url?: unknown; text?: unknown } | null;
  const url = typeof b?.url === "string" ? b.url : "";
  const text = typeof b?.text === "string" ? b.text : "";
  if (!url || !text) return null;
  return { url, text };
}

/**
 * Cycle anchor used for quota period queries.
 * Missing profile anchor falls back to today's UTC date (YYYY-MM-DD) —
 * intentionally different from the client calendar-month fallback.
 */
export function resolveCycleAnchorDate(
  profileAnchor: string | null | undefined,
  today = new Date(),
): string {
  return profileAnchor ?? today.toISOString().slice(0, 10);
}

export type QuotaEvaluation = {
  exceeded: boolean;
  used: number;
  quota: number;
  plan: string;
};

export function evaluateQuota(used: number, plan: string): QuotaEvaluation {
  const resolvedPlan = plan || "free";
  const quota = getMonthlyQuota(resolvedPlan);
  const usedCount = used || 0;
  return {
    exceeded: usedCount >= quota,
    used: usedCount,
    quota,
    plan: resolvedPlan,
  };
}

/** Payload returned with HTTP 429 when the user is over quota. */
export function buildQuotaExceededPayload(used: number, plan: string) {
  const evaluation = evaluateQuota(used, plan);
  return {
    error: "Quota exceeded",
    quotaExceeded: true as const,
    used: evaluation.used,
    quota: evaluation.quota,
    plan: evaluation.plan,
    message:
      evaluation.plan === "free"
        ? "You've used all 5 free summaries this month. Upgrade to Pro for 50 summaries/month!"
        : "You've reached your monthly limit. Contact us to upgrade your plan.",
  };
}
