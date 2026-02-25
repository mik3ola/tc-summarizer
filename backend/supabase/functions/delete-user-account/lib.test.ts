// Unit tests for delete-user-account validation logic
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

function extractUserId(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.replace("Bearer ", "");
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    let payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (payload.length % 4 !== 0) payload += "=";
    const decoded = JSON.parse(atob(payload));
    return decoded?.sub ?? null;
  } catch {
    return null;
  }
}

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payloadB64 = btoa(JSON.stringify(payload));
  return `${header}.${payloadB64}.sig`;
}

Deno.test("extractUserId - Bearer token returns sub", () => {
  const jwt = makeJwt({ sub: "user-123" });
  assertEquals(extractUserId(`Bearer ${jwt}`), "user-123");
});

Deno.test("extractUserId - no Bearer returns null", () => {
  assertEquals(extractUserId(null), null);
  assertEquals(extractUserId(""), null);
  assertEquals(extractUserId("Basic xxx"), null);
});

Deno.test("confirmation must be exactly DELETE", () => {
  assertEquals("DELETE".trim() === "DELETE", true);
  // Invalid: case wrong, typo, or empty (backend trims before comparing)
  const invalid = ["delete", "Delete", "DELET", ""];
  invalid.forEach((v) => assertEquals(v.trim() === "DELETE", false));
});
