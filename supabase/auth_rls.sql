-- Run AFTER enabling Google Auth in Supabase Dashboard.
-- Replaces permissive demo RLS with email-scoped policies for logged-in users only.
--
-- Prerequisites:
-- 1. Authentication → Providers → Google (enabled)
-- 2. Authentication → URL Configuration:
--    Site URL: https://YOUR-VERCEL-DOMAIN (or http://localhost:3000)
--    Redirect URLs: http://localhost:3000/auth/callback
--                     https://YOUR-VERCEL-DOMAIN/auth/callback

-- saved_words: remove demo policies
drop policy if exists "Allow anon read saved_words" on public.saved_words;
drop policy if exists "Allow anon insert saved_words" on public.saved_words;
drop policy if exists "Allow anon update saved_words" on public.saved_words;
drop policy if exists "Allow anon delete saved_words" on public.saved_words;

create policy "Users read own saved_words"
  on public.saved_words for select
  to authenticated
  using (user_email = (auth.jwt() ->> 'email'));

create policy "Users insert own saved_words"
  on public.saved_words for insert
  to authenticated
  with check (user_email = (auth.jwt() ->> 'email'));

create policy "Users update own saved_words"
  on public.saved_words for update
  to authenticated
  using (user_email = (auth.jwt() ->> 'email'))
  with check (user_email = (auth.jwt() ->> 'email'));

create policy "Users delete own saved_words"
  on public.saved_words for delete
  to authenticated
  using (user_email = (auth.jwt() ->> 'email'));

-- saved_sentences: remove demo policies
drop policy if exists "Allow anon read saved_sentences" on public.saved_sentences;
drop policy if exists "Allow anon insert saved_sentences" on public.saved_sentences;
drop policy if exists "Allow anon update saved_sentences" on public.saved_sentences;
drop policy if exists "Allow anon delete saved_sentences" on public.saved_sentences;

create policy "Users read own saved_sentences"
  on public.saved_sentences for select
  to authenticated
  using (user_email = (auth.jwt() ->> 'email'));

create policy "Users insert own saved_sentences"
  on public.saved_sentences for insert
  to authenticated
  with check (user_email = (auth.jwt() ->> 'email'));

create policy "Users update own saved_sentences"
  on public.saved_sentences for update
  to authenticated
  using (user_email = (auth.jwt() ->> 'email'))
  with check (user_email = (auth.jwt() ->> 'email'));

create policy "Users delete own saved_sentences"
  on public.saved_sentences for delete
  to authenticated
  using (user_email = (auth.jwt() ->> 'email'));
