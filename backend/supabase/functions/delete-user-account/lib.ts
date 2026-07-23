// Pure logic for delete-user-account — testable without Supabase/Stripe mocks

export const GRACE_DAYS = 30;

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

export function extractUserId(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const payload = decodeJwtPayload(authHeader.replace("Bearer ", ""));
  return payload?.sub ?? null;
}

/** Backend requires confirmation === "DELETE" after trim. */
export function isValidDeleteConfirmation(value: unknown): boolean {
  return typeof value === "string" && value.trim() === "DELETE";
}

/**
 * Compute the hard-deletion timestamp from "now" + grace period.
 * Uses calendar-day arithmetic via Date#setDate (same as index.ts historically).
 */
export function computeDeletionScheduledFor(
  now: Date = new Date(),
  graceDays: number = GRACE_DAYS
): string {
  const scheduled = new Date(now.getTime());
  scheduled.setDate(scheduled.getDate() + graceDays);
  return scheduled.toISOString();
}

/** If a deletion is already scheduled, return the existing ISO timestamp; else null. */
export function existingDeletionSchedule(
  profile: { deletion_scheduled_for?: string | null } | null | undefined
): string | null {
  const value = profile?.deletion_scheduled_for;
  return typeof value === "string" && value.length > 0 ? value : null;
}
