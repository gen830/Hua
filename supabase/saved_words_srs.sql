-- SRS fields for spaced-repetition review of saved_words.
-- Run in the Supabase SQL Editor after saved_words.sql (and ideally after auth_rls.sql).
-- Safe to re-run: uses IF NOT EXISTS / additive ALTER.

alter table public.saved_words
  add column if not exists due_at timestamptz not null default now(),
  add column if not exists interval_days integer not null default 0,
  add column if not exists ease real not null default 2.5,
  add column if not exists repetitions integer not null default 0,
  add column if not exists last_reviewed_at timestamptz;

-- Existing rows become due immediately so they enter today's review queue.
update public.saved_words
set due_at = now()
where due_at is null;

create index if not exists saved_words_user_due_at_idx
  on public.saved_words (user_email, due_at);
