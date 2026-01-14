# Quick Reference: Where to Find Your Supabase Keys

## Step 1: Get Your API Keys

1. In Supabase Dashboard, go to **Settings** (gear icon in left sidebar)
2. Click **API Keys** (under "PROJECT SETTINGS")
3. You'll see two keys:

### anon public key
- **Use for**: Extension code (safe to expose in client-side code)
- **Copy this**: The long string starting with `eyJhbGc...`
- **Where to use**: Extension's `src/options.js` and `src/background.js`

### service_role key
- **Use for**: Backend only (NEVER expose in extension/website)
- **Copy this**: The long string starting with `eyJhbGc...` (different from anon)
- **Where to use**: Supabase Edge Functions (via Supabase Dashboard secrets)

---

## Step 2: Save Your Project URL

From the same **Settings → API Keys** page:
- **Project URL**: `https://xxxxx.supabase.co`
- Copy this URL (you'll need it for the extension)

---

## Step 3: Store Secrets in Supabase (for Edge Functions)

1. Go to **Settings → Edge Functions → Secrets**
2. Click **Add new secret**
3. Add these secrets (we'll add them as we build):

   - `OPENAI_API_KEY` = `sk-your-openai-key`
   - `OPENAI_MODEL` = `gpt-4o-mini` (optional, this is the default)
   - `STRIPE_SECRET_KEY` = (we'll add this in Todo #4)
   - `STRIPE_WEBHOOK_SECRET` = (we'll add this in Todo #4)

---

## Quick Checklist

- [ ] Copied **Project URL**
- [ ] Copied **anon public key**
- [ ] Copied **service_role key** (keep this secret!)
- [ ] Saved all three somewhere secure (password manager, notes app, etc.)

---

**Next**: Continue with Step 3-7 of the Supabase setup guide.

