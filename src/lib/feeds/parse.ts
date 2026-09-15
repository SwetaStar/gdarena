import Parser from "rss-parser";
import { isPaywalledSource } from "./paywall";

export type FeedArticle = {
  title: string;
  link: string;
  /** ISO string, or null when the source didn't provide a parseable date. */
  publishedAt: string | null;
  snippet: string;
};

export type FeedResult = {
  id: string;
  name: string;
  url: string;
  paywalled: boolean;
  items: FeedArticle[] | null;
  error: string | null;
};

const FETCH_TIMEOUT_MS = 10_000;
const MAX_ITEMS_PER_FEED = 20;
const CACHE_TTL_MS = 15 * 60 * 1000;

// Different publishers block on different signals — some (PIB) reject a
// UA that self-identifies as a bot, others (RBI) reject a full modern
// browser UA. Trying a couple of realistic UAs in turn covers both without
// pretending to be any specific real user.
const USER_AGENTS = [
  "Mozilla/5.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
];

// Module-scoped cache, keyed by feed URL (not by user — the fetched
// content is identical for every user subscribed to the same public feed).
// Persists for the process lifetime: reliable within a single `next dev`
// run or a warm Vercel instance, reset on cold start/restart. Good enough
// for a 15-minute TTL at this scale; a Postgres-backed cache would be the
// next hardening step if that ever matters.
const cache = new Map<string, { result: FeedResult; fetchedAt: number }>();

function normalizeDate(isoDate?: string, pubDate?: string): string | null {
  for (const candidate of [isoDate, pubDate]) {
    if (!candidate) continue;
    const d = new Date(candidate);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

async function fetchFeed(
  id: string,
  name: string,
  url: string
): Promise<FeedResult> {
  const paywalled = isPaywalledSource(name, url);

  for (const userAgent of USER_AGENTS) {
    try {
      const parser = new Parser({
        timeout: FETCH_TIMEOUT_MS,
        headers: { "User-Agent": userAgent },
      });
      const feed = await parser.parseURL(url);
      const items: FeedArticle[] = feed.items.slice(0, MAX_ITEMS_PER_FEED).map((item) => ({
        title: item.title?.trim() || "(untitled)",
        link: item.link || url,
        publishedAt: normalizeDate(item.isoDate, item.pubDate),
        snippet: (item.contentSnippet || item.content || item.summary || "")
          .trim()
          .slice(0, 600),
      }));
      return { id, name, url, paywalled, items, error: null };
    } catch {
      // Try the next User-Agent before giving up on this feed.
    }
  }

  return {
    id,
    name,
    url,
    paywalled,
    items: null,
    error: "Couldn't load this feed.",
  };
}

/** Used when a user adds a feed URL — confirms it actually parses as RSS before saving. */
export async function validateFeedUrl(
  url: string
): Promise<{ ok: true; title?: string } | { ok: false; error: string }> {
  for (const userAgent of USER_AGENTS) {
    try {
      const parser = new Parser({
        timeout: FETCH_TIMEOUT_MS,
        headers: { "User-Agent": userAgent },
      });
      const feed = await parser.parseURL(url);
      return { ok: true, title: feed.title };
    } catch {
      // Try the next User-Agent before giving up.
    }
  }
  return { ok: false, error: "Couldn't parse this as an RSS feed." };
}

/** Fetches a feed, serving a cached result if it's under 15 minutes old. */
export async function getFeedCached(
  id: string,
  name: string,
  url: string
): Promise<FeedResult> {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    // Reuse the fetched content, but keep this caller's own id/name in
    // case two users have named the same feed URL differently.
    return { ...cached.result, id, name };
  }

  const result = await fetchFeed(id, name, url);
  cache.set(url, { result, fetchedAt: Date.now() });
  return result;
}
