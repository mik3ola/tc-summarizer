# Cron Setup

## 1. process-expired-downgrades

Downgrades subscriptions that have passed their `downgrade_scheduled_for` date.

## 1. Set CRON_SECRET

In Supabase Dashboard → Project Settings → Edge Functions → Secrets, add:

```
CRON_SECRET=<generate-a-random-secret>
```

## 2. Schedule the Cron

### Option A: Supabase pg_cron (if available)

```sql
SELECT cron.schedule(
  'process-expired-downgrades',
  '0 6 * * *',  -- Daily at 06:00 UTC
  $$
  SELECT net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/process-expired-downgrades',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.cron_secret'),
      'Content-Type', 'application/json'
    ),
    body := '{}'
  );
  $$
);
```

### Option B: External Cron (GitHub Actions, Vercel Cron, etc.)

Create a workflow that runs daily and calls:

```bash
curl -X POST \
  "https://<project-ref>.supabase.co/functions/v1/process-expired-downgrades" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json"
```

### Option C: Supabase Dashboard (Scheduled Invocations)

If your Supabase plan supports it, use Dashboard → Edge Functions → process-expired-downgrades → Schedule.

---

## 2. process-hard-deletions

Permanently deletes auth users whose `profiles.deletion_scheduled_for` has passed.

Same setup as above. Schedule daily, e.g. `0 6 * * *` (06:00 UTC):

```bash
curl -X POST \
  "https://<project-ref>.supabase.co/functions/v1/process-hard-deletions" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json"
```
