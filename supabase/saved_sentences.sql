-- Run this in the Supabase SQL Editor to create the saved_sentences table.

create table if not exists public.saved_sentences (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  source text not null,
  source_lang text not null default '',
  translation text not null,
  translation_pinyin text not null default '',
  words jsonb not null default '[]'::jsonb,
  grammar jsonb not null default '[]'::jsonb,
  added_at timestamptz not null default now(),
  unique (user_email, source, translation)
);

create index if not exists saved_sentences_user_email_idx
  on public.saved_sentences (user_email);

alter table public.saved_sentences enable row level security;

-- Demo: allow anon access (tighten with Supabase Auth in production)
create policy "Allow anon read saved_sentences"
  on public.saved_sentences for select
  to anon, authenticated
  using (true);

create policy "Allow anon insert saved_sentences"
  on public.saved_sentences for insert
  to anon, authenticated
  with check (true);

create policy "Allow anon update saved_sentences"
  on public.saved_sentences for update
  to anon, authenticated
  using (true);

create policy "Allow anon delete saved_sentences"
  on public.saved_sentences for delete
  to anon, authenticated
  using (true);
