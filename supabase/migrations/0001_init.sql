-- GDArena — initial schema
-- Run this once in the Supabase SQL editor (SQL Editor -> New query -> paste -> Run).
-- Safe to re-run: uses `if not exists` / `or replace` / `drop ... if exists` throughout.

-- ─────────────────────────────────────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text,
  last_name text,
  knowledge_level text check (knowledge_level in ('beginner', 'intermediate', 'aware')),
  interests text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- No insert/delete policy for users: rows are created by the
-- handle_new_user trigger below (security definer, bypasses RLS) and
-- removed automatically when the auth.users row is deleted (on delete cascade).

-- ─────────────────────────────────────────────────────────────────────────
-- feeds
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.feeds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  url text not null,
  name text not null
);

alter table public.feeds enable row level security;

drop policy if exists "feeds_select_own" on public.feeds;
create policy "feeds_select_own" on public.feeds
  for select using (auth.uid() = user_id);

drop policy if exists "feeds_insert_own" on public.feeds;
create policy "feeds_insert_own" on public.feeds
  for insert with check (auth.uid() = user_id);

drop policy if exists "feeds_update_own" on public.feeds;
create policy "feeds_update_own" on public.feeds
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "feeds_delete_own" on public.feeds;
create policy "feeds_delete_own" on public.feeds
  for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- sessions (GD Room outcomes — no transcripts, see Phase 3 constraint)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  topic text not null,
  scores jsonb not null default '{}'::jsonb,
  feedback text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.sessions enable row level security;

drop policy if exists "sessions_select_own" on public.sessions;
create policy "sessions_select_own" on public.sessions
  for select using (auth.uid() = user_id);

drop policy if exists "sessions_insert_own" on public.sessions;
create policy "sessions_insert_own" on public.sessions
  for insert with check (auth.uid() = user_id);

-- Session outcomes are an immutable record once scored: no update/delete policy.

-- ─────────────────────────────────────────────────────────────────────────
-- streaks
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.streaks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_active_date date
);

alter table public.streaks enable row level security;

drop policy if exists "streaks_select_own" on public.streaks;
create policy "streaks_select_own" on public.streaks
  for select using (auth.uid() = user_id);

drop policy if exists "streaks_insert_own" on public.streaks;
create policy "streaks_insert_own" on public.streaks
  for insert with check (auth.uid() = user_id);

drop policy if exists "streaks_update_own" on public.streaks;
create policy "streaks_update_own" on public.streaks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- New-user bootstrap: create the profile row and pre-seed the default RSS
-- feeds the moment someone signs up (auth.users insert), regardless of
-- whether email confirmation is required. security definer bypasses RLS.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name)
  values (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name'
  )
  on conflict (id) do nothing;

  insert into public.feeds (user_id, name, url)
  values
    -- Reuters killed its official public RSS feeds years ago. This is a
    -- Google News query scoped to reuters.com/business as a working
    -- stand-in — swap or remove it any time from the feed list.
    (new.id, 'Reuters (via Google News)', 'https://news.google.com/rss/search?q=site:reuters.com+business&hl=en-IN&gl=IN&ceid=IN:en'),
    (new.id, 'BBC Business', 'https://feeds.bbci.co.uk/news/business/rss.xml'),
    (new.id, 'The Hindu BusinessLine', 'https://www.thehindubusinessline.com/economy/feeder/default.rss'),
    (new.id, 'PIB Press Releases', 'https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3'),
    (new.id, 'RBI Press Releases', 'https://www.rbi.org.in/pressreleases_rss.xml'),
    (new.id, 'SEBI Press Releases', 'https://www.sebi.gov.in/sebirss.xml');

  insert into public.streaks (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
