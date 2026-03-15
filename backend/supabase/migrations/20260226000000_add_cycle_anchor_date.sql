-- Migration: add cycle_anchor_date to profiles
--
-- Each user's quota now resets on a rolling 30-day cycle anchored to their
-- signup date (free users) or their Pro upgrade date (Pro users), instead of
-- resetting for everyone on the 1st of each calendar month.

-- 1) Add the column (nullable initially so we can backfill first)
alter table public.profiles
  add column if not exists cycle_anchor_date date;

-- 2) Backfill existing users from their auth.users signup date
update public.profiles p
set cycle_anchor_date = (
  select u.created_at::date
  from auth.users u
  where u.id = p.user_id
)
where p.cycle_anchor_date is null;

-- 3) Make it non-nullable with a sensible default going forward
alter table public.profiles
  alter column cycle_anchor_date set not null,
  alter column cycle_anchor_date set default current_date;

-- 4) Update the handle_new_user() trigger to populate cycle_anchor_date on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, email, cycle_anchor_date)
  values (new.id, new.email, new.created_at::date);

  insert into public.subscriptions (user_id, status, plan)
  values (new.id, 'free', 'free');

  return new;
end;
$$ language plpgsql security definer;
