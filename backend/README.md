# Backend (Supabase) — Setup Guide

**⚠️ PROPRIETARY CODE**: This backend code is proprietary and not licensed for use. See [LICENSE](LICENSE) for details.

This backend is intended to:
- authenticate users (Supabase Auth)
- enforce subscription status + quota + rate limits
- call OpenAI using a **server-side** API key

## Environment Variables & Secrets

**Important**: This project uses **environment variables** (not Python virtual environments). Secrets are managed in two places:

### 1. Supabase Dashboard (Production Secrets)
For Edge Functions, store secrets in Supabase:
- Go to **Settings → Edge Functions → Secrets**
- Add: `OPENAI_API_KEY`, `OPENAI_MODEL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

### 2. Local Development (Optional)
If developing locally with Supabase CLI, create `backend/.env.local`:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-your-key
OPENAI_MODEL=gpt-4o-mini
```

**⚠️ Never commit `.env.local` files** (already in `.gitignore`)

## What you'll create in Supabase

1. **Database schema** (tables + RLS policies)
   - See `backend/supabase/schema.sql`
2. **Edge function** `summarize`
   - See `backend/supabase/functions/summarize/index.ts`
3. **Secrets** (in Supabase Dashboard)
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL` (optional, defaults to `gpt-4o-mini`)
   - `STRIPE_SECRET_KEY` (for Todo #4)
   - `STRIPE_WEBHOOK_SECRET` (for Todo #4)

## Notes
- For MVP, you can initially skip Stripe and manually mark a test user as `subscription_status='active'`.
- The extension will call your edge function endpoint and include the Supabase JWT.


