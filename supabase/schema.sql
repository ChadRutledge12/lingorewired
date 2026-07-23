-- LingoRewired — schema for saved decks + FSRS spaced-repetition review.
-- Run this in the Supabase dashboard → SQL Editor → New query → Run.
-- Safe to re-run (uses IF NOT EXISTS / idempotent policy drops).

-- ---------------------------------------------------------------------------
-- Decks: a named collection of cards, owned by one user.
-- ---------------------------------------------------------------------------
create table if not exists public.decks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  description text,
  -- Onboarding answers (level, goals, interests, contexts, location) captured
  -- at save time, so "Amplify deck" can generate genuinely related words
  -- later without the learner re-answering the questionnaire. Null for decks
  -- saved before this column existed — amplify falls back to a words-only
  -- prompt for those.
  profile     jsonb,
  created_at  timestamptz not null default now()
);

alter table public.decks add column if not exists profile jsonb;

-- ---------------------------------------------------------------------------
-- Cards: vocabulary content + FSRS scheduling state.
-- FSRS columns mirror the ts-fsrs Card shape (see lib/fsrs.js).
-- state: 0 New, 1 Learning, 2 Review, 3 Relearning.
-- ---------------------------------------------------------------------------
create table if not exists public.cards (
  id                  uuid primary key default gen_random_uuid(),
  deck_id             uuid not null references public.decks (id) on delete cascade,
  user_id             uuid not null references auth.users (id) on delete cascade,

  -- content
  word                text not null,
  translation         text,
  part_of_speech      text,
  example             text,
  example_translation text,
  tier                text,
  -- Cached "related words" cluster for the word-cloud view (jsonb array of
  -- {word, translation, connector}). Generated once on first request, then
  -- reused — see /api/cards/[cardId]/related.
  related_words       jsonb,

  -- FSRS scheduling state
  due                 timestamptz not null default now(),
  stability           double precision not null default 0,
  difficulty          double precision not null default 0,
  elapsed_days        double precision not null default 0,
  scheduled_days      double precision not null default 0,
  reps                integer not null default 0,
  lapses              integer not null default 0,
  learning_steps      integer not null default 0,
  state               smallint not null default 0,
  last_review         timestamptz,

  created_at          timestamptz not null default now()
);

alter table public.cards add column if not exists related_words jsonb;

-- ---------------------------------------------------------------------------
-- Review logs: append-only history of every rating (audit + future FSRS tuning).
-- ---------------------------------------------------------------------------
create table if not exists public.review_logs (
  id                uuid primary key default gen_random_uuid(),
  card_id           uuid not null references public.cards (id) on delete cascade,
  user_id           uuid not null references auth.users (id) on delete cascade,
  rating            smallint not null,
  state             smallint not null,
  due               timestamptz,
  stability         double precision,
  difficulty        double precision,
  elapsed_days      double precision,
  last_elapsed_days double precision,
  scheduled_days    double precision,
  review            timestamptz not null,
  created_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Readings: AI-generated short stories that use a deck's vocabulary in
-- context. content jsonb shape: { sentences: [{ es, en, targets: [{ surface,
-- gloss }] }] } — see /api/decks/[deckId]/readings.
-- ---------------------------------------------------------------------------
create table if not exists public.readings (
  id          uuid primary key default gen_random_uuid(),
  deck_id     uuid not null references public.decks (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null,
  scenario    text,
  content     jsonb not null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Profiles: per-user state — the canonical learning profile (onboarding
-- answers + freeform note) plus habit-loop state (daily goal, streak-freeze
-- bookkeeping, reminder-email opt-out). One row per user, created lazily.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  user_id           uuid primary key references auth.users (id) on delete cascade,
  -- The learner's answers, as edited on /settings. Source of truth for
  -- generation; decks.profile is a snapshot taken at deck-creation time.
  -- Shape: see lib/learningProfile.js. Null until they first save.
  learning_profile  jsonb,
  daily_goal        integer not null default 20,
  streak_freezes    integer not null default 1,
  frozen_dates      jsonb not null default '[]',
  last_review_date  date,
  reminders_enabled boolean not null default true,
  unsubscribe_token uuid not null default gen_random_uuid(),
  created_at        timestamptz not null default now()
);

alter table public.profiles add column if not exists learning_profile jsonb;

-- Indexes for the hot queries: cards in a deck, and "due now" per user.
create index if not exists cards_deck_id_idx     on public.cards (deck_id);
create index if not exists cards_user_due_idx     on public.cards (user_id, due);
create index if not exists review_logs_card_idx   on public.review_logs (card_id);
create index if not exists readings_deck_idx      on public.readings (deck_id);

-- ---------------------------------------------------------------------------
-- Row-Level Security: every user can only touch their own rows.
-- ---------------------------------------------------------------------------
alter table public.decks       enable row level security;
alter table public.cards       enable row level security;
alter table public.review_logs enable row level security;
alter table public.readings    enable row level security;
alter table public.profiles    enable row level security;

drop policy if exists "own decks"        on public.decks;
drop policy if exists "own cards"        on public.cards;
drop policy if exists "own review_logs"  on public.review_logs;
drop policy if exists "own readings"     on public.readings;
drop policy if exists "own profile"      on public.profiles;

create policy "own decks" on public.decks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own cards" on public.cards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own review_logs" on public.review_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own readings" on public.readings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own profile" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
