# Step-by-Step: Database Setup in Supabase

## Step 4: Create Tables + RLS Policies

1. Go to **SQL Editor** (left sidebar in Supabase Dashboard)
2. Click **New query**
3. Copy and paste this **entire SQL script**:

```sql
-- Supabase schema for T&C Hover Summarizer

-- 1) Profiles (ties to auth.users)
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

-- 2) Subscription status
create type if not exists public.subscription_status as enum ('free', 'active', 'past_due', 'canceled');

-- Plan tier (for quotas)
create type if not exists public.plan_tier as enum ('free', 'pro', 'enterprise');

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status public.subscription_status not null default 'free',
  plan public.plan_tier not null default 'free',
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

-- ============================================
-- RLS (Row Level Security) Policies
-- ============================================

-- Enable RLS on all tables
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
```

4. Click **Run** (or press `Cmd+Enter` / `Ctrl+Enter`)
5. You should see: **"Success. No rows returned"** ✅

**What this did:**
- ✅ Created 4 tables: `profiles`, `subscriptions`, `usage_events`, `usage_counters_monthly`
- ✅ Created 2 enum types: `subscription_status`, `plan_tier`
- ✅ Enabled RLS on all tables
- ✅ Created 7 RLS policies (users can only see/modify their own data)

---

## Step 5: Create Auto-Profile Trigger

This automatically creates a profile and subscription row when a new user signs up.

1. Still in **SQL Editor**, click **New query** (or create a new tab)
2. Copy and paste this SQL:

```sql
-- Auto-create profile + subscription when user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, email)
  values (new.id, new.email);
  
  insert into public.subscriptions (user_id, status, plan)
  values (new.id, 'free', 'free');
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger on auth.users insert
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

3. Click **Run**
4. You should see: **"Success. No rows returned"** ✅

**What this did:**
- ✅ Created a function `handle_new_user()` that runs automatically
- ✅ Created a trigger that fires when a new user signs up
- ✅ Automatically creates their profile and subscription (set to 'free' tier)

---

## Step 6: Verify Everything Works

1. Go to **Table Editor** (left sidebar)
2. You should see these 4 tables:
   - ✅ `profiles`
   - ✅ `subscriptions`
   - ✅ `usage_events`
   - ✅ `usage_counters_monthly`

3. (Optional) Test the trigger:
   - Go to **Authentication** → **Users**
   - Click **Add user** → Create a test user
   - Go back to **Table Editor** → `profiles` table
   - You should see the new user's profile automatically created! ✅

---

## ✅ Checklist

- [ ] Step 4: Created tables + RLS policies (ran first SQL script)
- [ ] Step 5: Created auto-profile trigger (ran second SQL script)
- [ ] Step 6: Verified tables exist in Table Editor
- [ ] (Optional) Tested trigger by creating a test user

---

**Next**: Continue with the rest of the Supabase setup (we'll add Edge Functions and secrets later).

