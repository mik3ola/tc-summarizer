# Production Architecture (T&C Hover Summarizer)

This document describes the **production** setup for the extension so users **do not paste API keys**.

## Components

### 1) Chrome Extension
- Detects legal links/buttons and extracts readable text
- Calls backend `POST /summarize` with:
  - **user auth token** (JWT)
  - page URL + extracted text
- Shows returned summary

### 2) Backend API (Supabase Edge Functions recommended first)
- Verifies user auth (Supabase JWT)
- Checks subscription status and quota
- Enforces rate limits
- Calls OpenAI using **server-side** API key
- Returns summary JSON

### 3) Database (Supabase Postgres)
Stores:
- user profile
- subscription status
- usage / quota counters
- optional cache metadata

### 4) Payments (Stripe)
- Checkout + subscriptions
- Webhook updates subscription status in DB

## Rate limits vs Quotas

- **Rate limit**: prevents abuse/spikes (e.g. *10 requests/minute/user*)
- **Quota**: caps monthly usage to control cost (e.g. *Free 20/month, Pro 500/month*)

## Suggested rollout
1. Backend + auth + quota enforcement
2. Extension login + backend usage
3. Website + pricing + privacy policy
4. Chrome Web Store publish


