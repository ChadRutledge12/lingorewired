-- Adds the "readings" table — run this once in the Supabase SQL Editor.
-- (Also folded into schema.sql for anyone setting up fresh.)
-- A reading is an AI-generated short story that uses a deck's vocabulary in
-- context, with per-sentence English and per-word contextual glosses stored
-- in `content` jsonb: { sentences: [{ es, en, targets: [{ surface, gloss }] }] }.
create table if not exists public.readings (
  id          uuid primary key default gen_random_uuid(),
  deck_id     uuid not null references public.decks (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null,
  scenario    text,
  content     jsonb not null,
  created_at  timestamptz not null default now()
);

create index if not exists readings_deck_idx on public.readings (deck_id);

alter table public.readings enable row level security;

drop policy if exists "own readings" on public.readings;
create policy "own readings" on public.readings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
