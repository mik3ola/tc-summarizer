# Step-by-Step: Stripe Setup

## Step 1: Create a Stripe Account

1. Go to **https://stripe.com**
2. Click **Start now** or sign in
3. Complete the signup process
4. Make sure you're in **Test mode** (toggle in top-right corner)

---

## Step 2: Create Your Product

1. Go to **Products** (left sidebar)
2. Click **Add product**
3. Fill in:
   - **Name**: `T&C Summarizer Pro`
   - **Description**: `50 AI-powered summaries per month`
4. Click **Add product**

---

## Step 3: Create the Price (£4.99/year)

1. On the product page, under **Pricing**, click **Add a price**
2. Fill in:
   - **Pricing model**: Standard pricing
   - **Price**: `4.99`
   - **Currency**: `GBP`
   - **Billing period**: `Yearly`
3. Click **Add price**
4. **Copy the Price ID** (looks like `price_1Abc123...`)

---

## Step 4: Get Your API Keys

1. Go to **Developers** → **API keys**
2. Copy:
   - **Secret key**: `sk_test_...` (click "Reveal test key" first)

---

## Step 5: Create a Webhook Endpoint

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Fill in:
   - **Endpoint URL**: `https://YOUR_SUPABASE_URL/functions/v1/stripe-webhook`
   - Replace `YOUR_SUPABASE_URL` with your actual Supabase project URL
   - Example: `https://rsxvxezucgczesplmjiw.supabase.co/functions/v1/stripe-webhook`
4. Click **Select events** and choose:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.paid`
   - ✅ `invoice.payment_failed`
5. Click **Add endpoint**
6. **Copy the Signing secret** (click "Reveal" - looks like `whsec_...`)

---

## Step 6: Add Secrets to Supabase

1. Go to your **Supabase Dashboard**
2. Go to **Settings** → **Edge Functions** → **Secrets**
3. Add these secrets:

| Name | Value |
|------|-------|
| `STRIPE_SECRET_KEY` | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` |
| `STRIPE_PRICE_ID` | `price_1Abc...` |
| `SITE_URL` | `https://your-website.com` (or `http://localhost:3000` for testing) |

---

## Step 7: Deploy the Edge Functions

We need to deploy two Edge Functions to Supabase:
- `stripe-webhook` — handles Stripe events
- `create-checkout` — creates checkout sessions for users

### Option A: Deploy via Supabase CLI (Recommended)

1. Install Supabase CLI:
   ```bash
   brew install supabase/tap/supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   cd /Users/michael.olaw/Desktop/AI/Personal-Projects/tc-summarizer/backend
   supabase link --project-ref rsxvxezucgczesplmjiw
   ```

4. Deploy the functions:
   ```bash
   supabase functions deploy stripe-webhook
   supabase functions deploy create-checkout
   supabase functions deploy summarize
   ```

### Option B: Deploy via Dashboard (Manual)

1. Go to **Edge Functions** in Supabase Dashboard
2. Click **New function**
3. Name it `stripe-webhook`
4. Copy-paste the code from `backend/supabase/functions/stripe-webhook/index.ts`
5. Repeat for `create-checkout` and `summarize`

---

## ✅ Checklist

- [ ] Created Stripe account
- [ ] Created "T&C Summarizer Pro" product
- [ ] Created £4.99/year price and noted the Price ID
- [ ] Copied Stripe Secret Key
- [ ] Created webhook endpoint
- [ ] Copied webhook Signing Secret
- [ ] Added all secrets to Supabase
- [ ] Deployed Edge Functions

---

## Testing the Integration

Once deployed, you can test:

1. Create a test user in Supabase Auth
2. Call the `create-checkout` endpoint with the user's JWT
3. Complete the Stripe checkout (use test card `4242 4242 4242 4242`)
4. Check that the user's subscription in Supabase updated to `status: 'active'`, `plan: 'pro'`

---

## Going Live

When ready for production:

1. Toggle Stripe to **Live mode**
2. Update the API keys and webhook secrets in Supabase to the live versions
3. Update the webhook endpoint URL to point to your production Supabase URL

