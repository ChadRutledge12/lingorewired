-- Adds the "profiles" table — run this once in the Supabase SQL Editor.
-- (Also folded into schema.sql for anyone setting up fresh.)
-- Per-user habit-loop state: daily review goal, streak-freeze bookkeeping,
-- and reminder-email opt-out. One row per user, created lazily (upserted)
-- on their first review rather than via a signup trigger.
create table if not exists public.profiles (
  user_id           uuid primary key references auth.users (id) on delete cascade,
  daily_goal        integer not null default 20,
  streak_freezes    integer not null default 1,
  -- Dates (YYYY-MM-DD) auto-forgiven by a spent streak freeze, so
  -- computeStreak (lib/stats.js) can bridge a single missed day without
  -- resetting the streak. Small, append-only.
  frozen_dates      jsonb not null default '[]',
  last_review_date  date,
  reminders_enabled boolean not null default true,
  unsubscribe_token uuid not null default gen_random_uuid(),
  created_at        timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
