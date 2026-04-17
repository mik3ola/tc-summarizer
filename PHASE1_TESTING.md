# Phase 1: Subscription Downgrade - Testing Guide

## What Was Implemented

1. **Database migration** – `backend/supabase/migrations/20260127000000_subscription_downgrade.sql`
2. **downgrade-subscription** edge function – Cancel auto-renewal or downgrade immediately
3. **process-expired-downgrades** cron function – Auto-downgrade when period ends
4. **Extension UI** – Subscription status, Cancel Auto-Renewal, Downgrade Now
5. **Stripe webhook** – Syncs `cancel_at_period_end` to DB
6. **Unit tests** – Vitest (extension) and Deno (edge function lib)

---

## Testing Phases

### Phase 1a: Database

1. Run the migration in Supabase SQL Editor:
   ```sql
   -- Copy contents of backend/supabase/migrations/20260127000000_subscription_downgrade.sql
   ```

### Phase 1b: Edge Function

1. Deploy: `supabase functions deploy downgrade-subscription`
2. Test with a Pro user's JWT:
   ```bash
   curl -X POST "https://<project>.supabase.co/functions/v1/downgrade-subscription" \
     -H "Authorization: Bearer <USER_ACCESS_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{"action":"cancel_auto_renew","reason":"user_requested"}'
   ```

### Phase 1c: Unit Tests

```bash
# All tests (Vitest + Deno) run in Docker
npm test

# Or manually:
# docker build -f Dockerfile.test -t termsdigest-test . && docker run --rm termsdigest-test

# Edge function lib tests (Deno) - only if running outside Docker:
cd backend/supabase/functions && deno test downgrade-subscription/lib.test.ts --allow-read
deno test delete-user-account/lib.test.ts --allow-read
```

### Phase 1d: Extension UI

1. Load the extension in Chrome
2. Sign in as a Pro user
3. Open Options – you should see:
   - Subscription: Pro (expires …)
   - Auto-renewal enabled / Disabled
   - [Cancel Auto-Renewal] and [Downgrade Now] buttons
4. Test Cancel Auto-Renewal → confirm → verify status updates
5. Test Downgrade Now → confirm → verify downgrade to Free

### Phase 1e: Cron (Optional)

1. Set `CRON_SECRET` in Supabase Edge Function secrets
2. Schedule `process-expired-downgrades` (see `backend/supabase/CRON_SETUP.md`)
3. Or call manually for testing:
   ```bash
   curl -X POST "https://<project>.supabase.co/functions/v1/process-expired-downgrades" \
     -H "Authorization: Bearer <CRON_SECRET>"
   ```

---

## Phase 2: Account Deletion - Tests

**All tests** (run with `npm test` – executes in Docker):
- `tests/delete-account-utils.test.js` – confirmation validation (must type "DELETE")

**Deno** (run manually):
```bash
cd backend/supabase/functions && deno test delete-user-account/lib.test.ts --allow-read
```
