// Unit tests for send-welcome-email lib
import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  authorizeWelcomeRequest,
  parseWelcomeEmailPayload,
  resolveSiteUrl,
  buildWelcomeEmailHtml,
  buildWelcomeEmailText,
} from "./lib.ts";

// ─── authorizeWelcomeRequest ────────────────────────────────────────────────

Deno.test("authorizeWelcomeRequest - missing secret is misconfigured", () => {
  const result = authorizeWelcomeRequest("Bearer secret", undefined);
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.status, 500);
    assertEquals(result.error, "Server misconfigured");
  }
});

Deno.test("authorizeWelcomeRequest - wrong secret is unauthorized", () => {
  const result = authorizeWelcomeRequest("Bearer wrong", "expected");
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.status, 401);
  }
});

Deno.test("authorizeWelcomeRequest - accepts Bearer or raw secret", () => {
  assertEquals(authorizeWelcomeRequest("Bearer top-secret", "top-secret").ok, true);
  assertEquals(authorizeWelcomeRequest("top-secret", "top-secret").ok, true);
});

// ─── parseWelcomeEmailPayload ───────────────────────────────────────────────

Deno.test("parseWelcomeEmailPayload - normalizes valid email", () => {
  const result = parseWelcomeEmailPayload({ email: "  User@Example.COM ", user_id: "u1" });
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.email, "user@example.com");
    assertEquals(result.userId, "u1");
  }
});

Deno.test("parseWelcomeEmailPayload - rejects missing or invalid email", () => {
  assertEquals(parseWelcomeEmailPayload({}).ok, false);
  assertEquals(parseWelcomeEmailPayload({ email: "nope" }).ok, false);
  assertEquals(parseWelcomeEmailPayload(null).ok, false);
});

// ─── resolveSiteUrl / email builders ────────────────────────────────────────

Deno.test("resolveSiteUrl - defaults when unset", () => {
  assertEquals(resolveSiteUrl(undefined), "https://termsdigest.com");
  assertEquals(resolveSiteUrl(""), "https://termsdigest.com");
  assertEquals(resolveSiteUrl(" https://staging.example.com "), "https://staging.example.com");
});

Deno.test("buildWelcomeEmailHtml - includes site links and year", () => {
  const html = buildWelcomeEmailHtml("https://termsdigest.com", 2026);
  assertStringIncludes(html, "https://termsdigest.com/logo.png");
  assertStringIncludes(html, "https://termsdigest.com/support");
  assertStringIncludes(html, "© 2026 TermsDigest");
});

Deno.test("buildWelcomeEmailText - includes support and visit URLs", () => {
  const text = buildWelcomeEmailText("https://termsdigest.com", 2026);
  assertStringIncludes(text, "Visit TermsDigest: https://termsdigest.com");
  assertStringIncludes(text, "Support page: https://termsdigest.com/support");
  assertStringIncludes(text, "© 2026 Screenx Ltd.");
});
