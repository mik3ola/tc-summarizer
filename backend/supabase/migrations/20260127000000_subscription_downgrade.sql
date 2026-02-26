-- Migration: Subscription downgrade support (Phase 1 - Account Management)
-- Adds columns for auto-renewal, scheduled downgrade, and audit logging.

-- 1) Add columns to subscriptions
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS auto_renew boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS downgrade_scheduled_for timestamptz,
  ADD COLUMN IF NOT EXISTS downgrade_reason text;

-- 2) Create subscription_changes audit table
CREATE TABLE IF NOT EXISTS public.subscription_changes (
  id bigserial primary key,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  reason text,
  previous_status public.subscription_status,
  previous_plan public.plan_tier,
  new_status public.subscription_status,
  new_plan public.plan_tier,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3) RLS for subscription_changes (users can read their own)
ALTER TABLE public.subscription_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscription_changes_select_own"
ON public.subscription_changes FOR SELECT
USING (auth.uid() = user_id);

-- Inserts done by service role / edge functions only (no user insert policy)

-- 4) Index for cron job: find subscriptions due for downgrade
CREATE INDEX IF NOT EXISTS idx_subscriptions_downgrade_scheduled
ON public.subscriptions(downgrade_scheduled_for)
WHERE downgrade_scheduled_for IS NOT NULL AND status = 'active';
