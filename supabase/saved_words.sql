-- Run this in the Supabase SQL Editor to create the saved_words table.

create table if not exists public.saved_words (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  hanzi text not null,
  pinyin text not null default '',
  bopomofo text not null default '',
  jp text not null default '',
  pos text not null default '',
  status text not null default 'reviewing' check (status in ('reviewing', 'mastered')),
  added_at timestamptz not null default now(),
  -- Spaced repetition (SM-2 lite); see saved_words_srs.sql for ALTER on existing DBs
  due_at timestamptz not null default now(),
  interval_days integer not null default 0,
  ease real not null default 2.5,
  repetitions integer not null default 0,
  last_reviewed_at timestamptz,
  unique (user_email, hanzi)
);

create index if not exists saved_words_user_email_idx
  on public.saved_words (user_email);

create index if not exists saved_words_user_due_at_idx
  on public.saved_words (user_email, due_at);

alter table public.saved_words enable row level security;

-- Demo: allow anon access (tighten with Supabase Auth in production)
create policy "Allow anon read saved_words"
  on public.saved_words for select
  to anon, authenticated
  using (true);

create policy "Allow anon insert saved_words"
  on public.saved_words for insert
  to anon, authenticated
  with check (true);

create policy "Allow anon update saved_words"
  on public.saved_words for update
  to anon, authenticated
  using (true);

create policy "Allow anon delete saved_words"
  on public.saved_words for delete
  to anon, authenticated
  using (true);
