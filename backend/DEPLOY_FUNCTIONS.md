# Deploy Edge Functions via Supabase Dashboard

## Step 1: Deploy `summarize` Function

1. Go to **Edge Functions** in your Supabase Dashboard
2. Click **Create a new function**
3. Fill in:
   - **Function name**: `summarize`
   - **Code**: Copy the entire contents of `backend/supabase/functions/summarize/index.ts`
4. Click **Deploy**

**If you already deployed `summarize` earlier**: re-deploy it once more using the latest code from the repo so it includes **CORS headers** (required for Chrome extension requests).

---

## Step 2: Deploy `stripe-webhook` Function

1. Click **Create a new function** again
2. Fill in:
   - **Function name**: `stripe-webhook`
   - **Code**: Copy the entire contents of `backend/supabase/functions/stripe-webhook/index.ts`
3. Click **Deploy**

---

## Step 3: Deploy `create-checkout` Function

1. Click **Create a new function** again
2. Fill in:
   - **Function name**: `create-checkout`
   - **Code**: Copy the entire contents of `backend/supabase/functions/create-checkout/index.ts`
3. Click **Deploy**

---

## Step 4: Verify Functions Are Deployed

1. Go to **Edge Functions** in the dashboard
2. You should see all 3 functions:
   - ✅ `summarize`
   - ✅ `stripe-webhook`
   - ✅ `create-checkout`

---

## Step 5: Add Missing Secrets

Make sure you have these secrets in **Settings → Edge Functions → Secrets**:

- ✅ `STRIPE_SECRET_KEY`
- ✅ `STRIPE_WEBHOOK_SECRET`
- ✅ `STRIPE_PRICE_ID`
- ✅ `SITE_URL`
- ⚠️ **Add these OpenAI secrets:**
  - `OPENAI_API_KEY` = Your OpenAI API key (starts with `sk-...`)
  - `OPENAI_MODEL` = `gpt-4o-mini` (optional, this is the default)

---

## Step 6: Test the Webhook

1. Go to your Stripe Dashboard → **Webhooks**
2. Click on your webhook endpoint
3. Click **Send test webhook**
4. Select an event (e.g., `checkout.session.completed`)
5. Check Supabase **Edge Functions → Logs** to see if it received the event

---

## ✅ Checklist

- [ ] All 3 functions deployed
- [ ] All secrets added (including OpenAI)
- [ ] Webhook tested (optional)

---

**Next**: Once deployed, we'll test the integration and move on to Todo #5-8 (Extension integration).

