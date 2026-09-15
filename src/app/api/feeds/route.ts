import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFeedCached, type FeedResult } from "@/lib/feeds/parse";
import { callLLM } from "@/lib/llm/callLLM";
import { extractJson } from "@/lib/llm/parseJson";
import {
  buildRelevancePrompt,
  isAlwaysRelevant,
  isRelevanceResult,
  type RelevanceCandidate,
} from "@/lib/feeds/relevance";

// Relevance classification is a real Gemini call (batched, once per
// request) — give this room beyond the platform default.
export const maxDuration = 30;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: { geminiKey?: unknown };
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const geminiKey = typeof body.geminiKey === "string" ? body.geminiKey.trim() : "";

  const { data: feeds, error } = await supabase
    .from("feeds")
    .select("id, name, url")
    .eq("user_id", user.id)
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Each feed fetch is independently cached/fault-isolated: one dead feed
  // never fails the others. Zero Gemini cost — plain RSS parsing.
  const results = await Promise.all(
    (feeds ?? []).map((feed) => getFeedCached(feed.id, feed.name, feed.url))
  );

  // No key yet? Skip filtering entirely rather than block the News tab —
  // same "works without a key, briefs just need one" pattern as elsewhere.
  if (!geminiKey) {
    return NextResponse.json({ feeds: results, filteringApplied: false });
  }

  const filtered = await filterForRelevance(results, geminiKey, supabase);
  return NextResponse.json({ feeds: filtered, filteringApplied: true });
}

async function filterForRelevance(
  feeds: FeedResult[],
  geminiKey: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<FeedResult[]> {
  // Collect every candidate article (skip official sources — always
  // relevant by definition, no need to spend a classification on them —
  // and skip anything already errored/empty).
  const candidateLinks = new Set<string>();
  for (const feed of feeds) {
    if (!feed.items) continue;
    for (const item of feed.items) {
      if (!isAlwaysRelevant(feed.url)) candidateLinks.add(item.link);
    }
  }

  if (candidateLinks.size === 0) return feeds;

  // Reuse verdicts already cached from any user classifying these exact
  // articles before — an article's relevance never changes, so this is
  // classified at most once, ever, across everyone.
  const { data: cached } = await supabase
    .from("article_relevance")
    .select("article_url, relevant")
    .in("article_url", Array.from(candidateLinks));

  const relevantSet = new Set<string>();
  const knownLinks = new Set<string>();
  for (const row of cached ?? []) {
    knownLinks.add(row.article_url);
    if (row.relevant) relevantSet.add(row.article_url);
  }

  const uncached = Array.from(candidateLinks).filter((link) => !knownLinks.has(link));

  if (uncached.length > 0) {
    const candidates: RelevanceCandidate[] = [];
    const indexToLink = new Map<number, string>();
    let i = 1;
    for (const feed of feeds) {
      if (!feed.items) continue;
      for (const item of feed.items) {
        if (!uncached.includes(item.link)) continue;
        candidates.push({ index: i, title: item.title, snippet: item.snippet });
        indexToLink.set(i, item.link);
        i++;
      }
    }

    const prompt = buildRelevancePrompt(candidates);
    const result = await callLLM("gemini", geminiKey, prompt, { json: true });

    if (result.ok) {
      try {
        const parsed = extractJson(result.text);
        if (isRelevanceResult(parsed)) {
          const relevantIndices = new Set(parsed.relevant);
          const rowsToInsert = Array.from(indexToLink.entries()).map(([idx, link]) => ({
            article_url: link,
            relevant: relevantIndices.has(idx),
          }));
          for (const row of rowsToInsert) {
            if (row.relevant) relevantSet.add(row.article_url);
          }
          // Best-effort cache write — don't fail the request if this errors.
          await supabase
            .from("article_relevance")
            .upsert(rowsToInsert, { onConflict: "article_url", ignoreDuplicates: true });
        } else {
          // Malformed response — show the uncached items rather than
          // silently dropping content we couldn't classify.
          for (const link of uncached) relevantSet.add(link);
        }
      } catch {
        for (const link of uncached) relevantSet.add(link);
      }
    } else {
      // Classification failed (rate limit, etc.) — default to showing
      // rather than hiding content when we're not sure.
      for (const link of uncached) relevantSet.add(link);
    }
  }

  return feeds.map((feed) => {
    if (!feed.items) return feed;
    if (isAlwaysRelevant(feed.url)) return feed;
    return { ...feed, items: feed.items.filter((item) => relevantSet.has(item.link)) };
  });
}
