-- Adds the "related_words" column to cards — run this once in the Supabase SQL Editor.
-- (Also folded into schema.sql for anyone setting up fresh.)
alter table public.cards add column if not exists related_words jsonb;
