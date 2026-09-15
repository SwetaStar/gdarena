-- GDArena — Phase 2 refinement: article relevance filter cache
-- Run via: npm run db:migrate -- supabase/migrations/0003_article_relevance.sql
-- Safe to re-run.

-- Whether an article is worth showing for GD prep (vs. crime/celebrity/
-- lifestyle noise that slips into general "News" RSS feeds). Classified
-- once by Gemini, cached forever — an article's relevance doesn't change
-- over time, so unlike article_briefs (which varies by knowledge_level)
-- this has no need to ever be reclassified.
create table if not exists public.article_relevance (
  article_url text primary key,
  relevant boolean not null,
  checked_at timestamptz not null default now()
);

alter table public.article_relevance enable row level security;

-- Same shared-cache pattern as article_briefs: this holds only a
-- relevance verdict on public news article titles, nothing personal, so
-- any signed-in user may read or add to it.
drop policy if exists "article_relevance_select_authenticated" on public.article_relevance;
create policy "article_relevance_select_authenticated" on public.article_relevance
  for select using (auth.uid() is not null);

drop policy if exists "article_relevance_insert_authenticated" on public.article_relevance;
create policy "article_relevance_insert_authenticated" on public.article_relevance
  for insert with check (auth.uid() is not null);

-- No update/delete policy — entries are immutable once cached. The app
-- upserts with ON CONFLICT DO NOTHING (see src/app/api/feeds/route.ts),
-- so a race between two users classifying the same article never errors.
