// Pure logic for process-hard-deletions cron — testable without Supabase mocks

export type HardDeletionCandidate = {
  user_id: string;
  deletion_scheduled_for?: string | null;
};

/**
 * Cron auth: Authorization: Bearer <CRON_SECRET>
 */
export function authorizeCron(
  authHeader: string | null,
  cronSecret: string | undefined | null
): boolean {
  if (!cronSecret) return false;
  const provided = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  return provided === cronSecret;
}

/**
 * Whether a profile row should be hard-deleted by the cron.
 * Mirrors the DB filters: deletion_scheduled_for is set and <= now.
 */
export function isHardDeletionCandidate(
  profile: HardDeletionCandidate | null | undefined,
  now: Date | string = new Date()
): boolean {
  if (!profile?.user_id) return false;
  if (!profile.deletion_scheduled_for) return false;

  const nowMs = typeof now === "string" ? new Date(now).getTime() : now.getTime();
  const scheduledMs = new Date(profile.deletion_scheduled_for).getTime();
  if (Number.isNaN(nowMs) || Number.isNaN(scheduledMs)) return false;
  return scheduledMs <= nowMs;
}

/** Aggregate response payload after processing the due deletion queue. */
export function buildHardDeletionResult(
  deleted: string[],
  errors: { user_id: string; error: string }[]
) {
  return {
    success: true as const,
    deleted: deleted.length,
    errors: errors.length,
  };
}
