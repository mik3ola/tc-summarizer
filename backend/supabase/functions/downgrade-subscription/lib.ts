// Pure logic for downgrade-subscription - testable without mocks

export function decodeJwtPayload(token: string): { sub: string } | null {
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

export type Action = "cancel_auto_renew" | "re_enable_auto_renew" | "downgrade_now";
export type Reason = "user_requested" | "expired" | "payment_failed";

const VALID_ACTIONS: Action[] = ["cancel_auto_renew", "re_enable_auto_renew", "downgrade_now"];
const VALID_REASONS: Reason[] = ["user_requested", "expired", "payment_failed"];

export function validateRequestBody(body: unknown): { action: Action; reason: Reason } {
  const b = body as Record<string, unknown> | null;
  if (!b || typeof b !== "object") {
    throw new Error("Invalid request body");
  }
  const action = b.action as string | undefined;
  const reasonRaw = (b.reason as string) || "user_requested";
  const reason = VALID_REASONS.includes(reasonRaw as Reason) ? (reasonRaw as Reason) : "user_requested";

  if (!action || !VALID_ACTIONS.includes(action as Action)) {
    throw new Error("Invalid action. Use cancel_auto_renew, re_enable_auto_renew, or downgrade_now");
  }
  return { action: action as Action, reason };
}

export function extractUserId(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const payload = decodeJwtPayload(authHeader.replace("Bearer ", ""));
  return payload?.sub ?? null;
}
