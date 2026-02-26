-- Migration: Account deletion support (Phase 2 - minimal)
-- Adds columns for soft-delete with 30-day grace period.

-- 1) Add columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deletion_scheduled_for timestamptz,
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;

-- 2) RLS: block access for users who requested deletion (during grace period they can still undo via support)
-- For now we allow access during grace period - they can use the app until deletion_scheduled_for passes.
-- The cron will delete auth.users, which cascades and removes the profile.

-- 3) Index for cron: find profiles due for hard deletion
CREATE INDEX IF NOT EXISTS idx_profiles_deletion_scheduled
ON public.profiles(deletion_scheduled_for)
WHERE deletion_scheduled_for IS NOT NULL AND is_deleted = false;
