# Backend (Supabase) — Setup Guide

**⚠️ PROPRIETARY CODE**: This backend code is proprietary and not licensed for use. See [LICENSE](LICENSE) for details.

This backend is intended to:
- authenticate users (Supabase Auth)
- enforce subscription status + quota + rate limits
- call OpenAI using a **server-side** API key

## What you'll create in Supabase

1. **Database schema** (tables + RLS policies)
   - See `backend/supabase/schema.sql`
2. **Edge function** `summarize`
   - See `backend/supabase/functions/summarize/index.ts`
3. **Secrets**
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL` (optional)
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`

## Notes
- For MVP, you can initially skip Stripe and manually mark a test user as `subscription_status='active'`.
- The extension will call your edge function endpoint and include the Supabase JWT.


