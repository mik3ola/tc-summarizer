// Unit tests for summarize lib
import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  getMonthlyQuota,
  periodStart,
  decodeJwtPayload,
  buildPrompt,
  resolvedSiteUrl,
  extractUserIdFromAuthHeader,
  parseSummarizeRequestBody,
  resolveCycleAnchorDate,
  evaluateQuota,
  buildQuotaExceededPayload,
} from "./lib.ts";

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payloadB64 = btoa(JSON.stringify(payload));
  return `${header}.${payloadB64}.fake-signature`;
}

// ─── getMonthlyQuota ────────────────────────────────────────────────────────

Deno.test("getMonthlyQuota - free plan returns 5", () => {
  assertEquals(getMonthlyQuota("free"), 5);
});

Deno.test("getMonthlyQuota - unknown plan defaults to 5", () => {
  assertEquals(getMonthlyQuota(""), 5);
  assertEquals(getMonthlyQuota("unknown"), 5);
});

Deno.test("getMonthlyQuota - pro plan returns 50", () => {
  assertEquals(getMonthlyQuota("pro"), 50);
});

Deno.test("getMonthlyQuota - enterprise plan returns 5000", () => {
  assertEquals(getMonthlyQuota("enterprise"), 5000);
});

// ─── periodStart ────────────────────────────────────────────────────────────

Deno.test("periodStart - anchor day returns anchor on same day", () => {
  const result = periodStart("2026-01-20", new Date("2026-01-20T00:00:00Z"));
  assertEquals(result, "2026-01-20");
});

Deno.test("periodStart - day before anchor is still in previous period", () => {
  // anchor 2026-01-20, today 2026-02-18 → 29 days elapsed → still period 0
  const result = periodStart("2026-01-20", new Date("2026-02-18T12:00:00Z"));
  assertEquals(result, "2026-01-20");
});

Deno.test("periodStart - exactly 30 days later starts period 1", () => {
  // anchor 2026-01-20, today 2026-02-19 → 30 days elapsed → period 1
  const result = periodStart("2026-01-20", new Date("2026-02-19T00:00:00Z"));
  assertEquals(result, "2026-02-19");
});

Deno.test("periodStart - mid second period returns correct start", () => {
  // anchor 2026-01-20, today 2026-02-25 → 36 days → period 1 start = 2026-02-19
  const result = periodStart("2026-01-20", new Date("2026-02-25T00:00:00Z"));
  assertEquals(result, "2026-02-19");
});

Deno.test("periodStart - exactly 60 days later starts period 2", () => {
  const result = periodStart("2026-01-20", new Date("2026-03-21T00:00:00Z"));
  assertEquals(result, "2026-03-21");
});

Deno.test("periodStart - today before anchor clamps to anchor", () => {
  // Should not return a date before the anchor
  const result = periodStart("2026-03-01", new Date("2026-02-01T00:00:00Z"));
  assertEquals(result, "2026-03-01");
});

Deno.test("periodStart - returns YYYY-MM-DD format string", () => {
  const result = periodStart("2026-01-15", new Date("2026-01-15T00:00:00Z"));
  assertEquals(typeof result, "string");
  assertEquals(result.length, 10);
});

// ─── decodeJwtPayload ───────────────────────────────────────────────────────

Deno.test("decodeJwtPayload - valid JWT returns payload", () => {
  const jwt = makeJwt({ sub: "user-123", role: "authenticated" });
  const result = decodeJwtPayload(jwt);
  assertEquals(result?.sub, "user-123");
});

Deno.test("decodeJwtPayload - invalid JWT returns null", () => {
  assertEquals(decodeJwtPayload(""), null);
  assertEquals(decodeJwtPayload("not-a-jwt"), null);
  assertEquals(decodeJwtPayload("a.b"), null);
});

Deno.test("decodeJwtPayload - malformed base64 returns null", () => {
  assertEquals(decodeJwtPayload("a.!!!.c"), null);
});

// ─── buildPrompt ────────────────────────────────────────────────────────────

Deno.test("buildPrompt - includes url and text in user prompt", () => {
  const result = buildPrompt("https://example.com/terms", "some legal text here");
  assertStringIncludes(result.user, "https://example.com/terms");
  assertStringIncludes(result.user, "some legal text here");
});

Deno.test("buildPrompt - system prompt is non-empty string", () => {
  const result = buildPrompt("https://example.com", "text");
  assertEquals(typeof result.system, "string");
  assertEquals(result.system.length > 0, true);
});

Deno.test("buildPrompt - user prompt requests JSON output", () => {
  const result = buildPrompt("https://example.com", "text");
  assertStringIncludes(result.user, "JSON");
  assertStringIncludes(result.user, "confidence");
});

// ─── resolvedSiteUrl ────────────────────────────────────────────────────────

Deno.test("resolvedSiteUrl - uses env value when set to production domain", () => {
  assertEquals(resolvedSiteUrl("https://termsdigest.com"), "https://termsdigest.com");
  assertEquals(resolvedSiteUrl("https://staging.termsdigest.com"), "https://staging.termsdigest.com");
});

Deno.test("resolvedSiteUrl - falls back to production when env is localhost", () => {
  assertEquals(resolvedSiteUrl("http://localhost:3000"), "https://termsdigest.com");
  assertEquals(resolvedSiteUrl("http://localhost:54321"), "https://termsdigest.com");
});

Deno.test("resolvedSiteUrl - falls back to production when env is undefined", () => {
  assertEquals(resolvedSiteUrl(undefined), "https://termsdigest.com");
});

// ─── extractUserIdFromAuthHeader ────────────────────────────────────────────

Deno.test("extractUserIdFromAuthHeader - reads sub from Bearer JWT", () => {
  const jwt = makeJwt({ sub: "user-abc", role: "authenticated" });
  assertEquals(extractUserIdFromAuthHeader(`Bearer ${jwt}`), "user-abc");
});

Deno.test("extractUserIdFromAuthHeader - rejects missing/invalid headers", () => {
  assertEquals(extractUserIdFromAuthHeader(null), null);
  assertEquals(extractUserIdFromAuthHeader(""), null);
  assertEquals(extractUserIdFromAuthHeader("Basic abc"), null);
  assertEquals(extractUserIdFromAuthHeader("Bearer not-a-jwt"), null);
});

// ─── parseSummarizeRequestBody ──────────────────────────────────────────────

Deno.test("parseSummarizeRequestBody - requires non-empty url and text", () => {
  assertEquals(
    parseSummarizeRequestBody({ url: "https://example.com/terms", text: "hello" }),
    { url: "https://example.com/terms", text: "hello" },
  );
  assertEquals(parseSummarizeRequestBody({ url: "", text: "hello" }), null);
  assertEquals(parseSummarizeRequestBody({ url: "https://x.com", text: "" }), null);
  assertEquals(parseSummarizeRequestBody(null), null);
  assertEquals(parseSummarizeRequestBody({ url: 1, text: "x" }), null);
});

// ─── resolveCycleAnchorDate ─────────────────────────────────────────────────

Deno.test("resolveCycleAnchorDate - uses profile anchor when present", () => {
  assertEquals(
    resolveCycleAnchorDate("2026-01-20", new Date("2026-07-27T12:00:00Z")),
    "2026-01-20",
  );
});

Deno.test("resolveCycleAnchorDate - falls back to today's UTC date (not month start)", () => {
  // Server missing-anchor path uses today; client uses calendar month start.
  assertEquals(
    resolveCycleAnchorDate(null, new Date("2026-07-27T15:30:00Z")),
    "2026-07-27",
  );
  assertEquals(
    resolveCycleAnchorDate(undefined, new Date("2026-12-01T00:00:00Z")),
    "2026-12-01",
  );
});

// ─── evaluateQuota / buildQuotaExceededPayload ──────────────────────────────

Deno.test("evaluateQuota - free plan exceeds at 5", () => {
  assertEquals(evaluateQuota(4, "free"), {
    exceeded: false,
    used: 4,
    quota: 5,
    plan: "free",
  });
  assertEquals(evaluateQuota(5, "free").exceeded, true);
  assertEquals(evaluateQuota(0, "").quota, 5);
});

Deno.test("evaluateQuota - pro plan exceeds at 50", () => {
  assertEquals(evaluateQuota(49, "pro").exceeded, false);
  assertEquals(evaluateQuota(50, "pro").exceeded, true);
  assertEquals(evaluateQuota(50, "pro").quota, 50);
});

Deno.test("buildQuotaExceededPayload - sets quotaExceeded and plan-specific message", () => {
  const free = buildQuotaExceededPayload(5, "free");
  assertEquals(free.quotaExceeded, true);
  assertEquals(free.error, "Quota exceeded");
  assertEquals(free.quota, 5);
  assertStringIncludes(free.message, "Upgrade to Pro");

  const pro = buildQuotaExceededPayload(50, "pro");
  assertEquals(pro.quota, 50);
  assertEquals(pro.plan, "pro");
  assertStringIncludes(pro.message, "monthly limit");
});
