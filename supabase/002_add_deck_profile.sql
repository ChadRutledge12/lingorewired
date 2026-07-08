-- Adds the "profile" column to decks — run this once in the Supabase SQL Editor.
-- (Also folded into schema.sql for anyone setting up fresh.)
alter table public.decks add column if not exists profile jsonb;
