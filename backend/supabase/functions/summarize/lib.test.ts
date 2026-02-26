// Unit tests for summarize lib
import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { getMonthlyQuota, monthStart, decodeJwtPayload, buildPrompt, resolvedSiteUrl } from "./lib.ts";

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

// ─── monthStart ─────────────────────────────────────────────────────────────

Deno.test("monthStart - returns YYYY-MM-01 format", () => {
  const result = monthStart(new Date("2026-02-15T12:00:00Z"));
  assertEquals(result, "2026-02-01");
});

Deno.test("monthStart - first day of month stays same", () => {
  const result = monthStart(new Date("2026-01-01T00:00:00Z"));
  assertEquals(result, "2026-01-01");
});

Deno.test("monthStart - end of month uses correct month", () => {
  const result = monthStart(new Date("2026-03-31T23:59:59Z"));
  assertEquals(result, "2026-03-01");
});

Deno.test("monthStart - uses current date when no arg", () => {
  const result = monthStart();
  assertEquals(typeof result, "string");
  assertEquals(result.length, 10);
  assertEquals(result.slice(-2), "01");
});

// ─── decodeJwtPayload ───────────────────────────────────────────────────────

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payloadB64 = btoa(JSON.stringify(payload));
  return `${header}.${payloadB64}.fake-signature`;
}

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
