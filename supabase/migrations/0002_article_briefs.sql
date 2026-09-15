-- GDArena — Phase 2: shared brief cache
-- Run via: npm run db:migrate -- supabase/migrations/0002_article_briefs.sql
-- Safe to re-run.

-- Generated briefs are cached by (article_url, knowledge_level) so two
-- users reading the same article at the same knowledge level don't both
-- pay Gemini quota for it. Knowledge level is part of the key because the
-- brief's depth/language genuinely differs by level (see Phase 2 spec).
create table if not exists public.article_briefs (
  article_url text not null,
  knowledge_level text not null check (knowledge_level in ('beginner', 'intermediate', 'aware')),
  brief jsonb not null,
  created_at timestamptz not null default now(),
  primary key (article_url, knowledge_level)
);

alter table public.article_briefs enable row level security;

-- Unlike every other table in this app, this is a SHARED cache, not
-- per-user data: it holds only generated analysis of public news article
-- text, nothing personal. Any signed-in user may read or add to it.
drop policy if exists "article_briefs_select_authenticated" on public.article_briefs;
create policy "article_briefs_select_authenticated" on public.article_briefs
  for select using (auth.uid() is not null);

drop policy if exists "article_briefs_insert_authenticated" on public.article_briefs;
create policy "article_briefs_insert_authenticated" on public.article_briefs
  for insert with check (auth.uid() is not null);

-- No update/delete policy: entries are immutable once cached. The app
-- upserts with ON CONFLICT DO NOTHING (see src/app/api/briefs/route.ts), so
-- a race between two users generating the same brief simultaneously never
-- errors — it just doesn't need UPDATE privileges.
