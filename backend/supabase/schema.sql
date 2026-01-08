-- Supabase schema for T&C Hover Summarizer
-- Apply in Supabase SQL editor.

-- 1) Profiles (ties to auth.users)
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

-- 2) Subscription status
create type if not exists public.subscription_status as enum ('free', 'active', 'past_due', 'canceled');

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status public.subscription_status not null default 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

-- 3) Usage events (for audits + analytics)
create table if not exists public.usage_events (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  url text,
  url_hash text,
  input_chars int,
  model text,
  cached boolean default false
);

-- 4) Monthly counters (simple quota enforcement)
create table if not exists public.usage_counters_monthly (
  user_id uuid references auth.users(id) on delete cascade,
  month_start date not null,
  summaries_count int not null default 0,
  primary key (user_id, month_start)
);

-- RLS
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_events enable row level security;
alter table public.usage_counters_monthly enable row level security;

-- Profiles: users can read/write their own profile
create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = user_id);

create policy "profiles_upsert_own"
on public.profiles for insert
with check (auth.uid() = user_id);

create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = user_id);

-- Subscriptions: users can read their own status
create policy "subs_select_own"
on public.subscriptions for select
using (auth.uid() = user_id);

-- IMPORTANT: writes to subscriptions should be done by service role / webhook handler.

-- Usage events: users can read their own events
create policy "usage_events_select_own"
on public.usage_events for select
using (auth.uid() = user_id);

-- IMPORTANT: inserts typically performed by backend function using user JWT or service role.
create policy "usage_events_insert_own"
on public.usage_events for insert
with check (auth.uid() = user_id);

-- Usage counters: users can read their own counters
create policy "usage_counters_select_own"
on public.usage_counters_monthly for select
using (auth.uid() = user_id);


