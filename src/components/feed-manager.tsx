"use client";

import { useState, useTransition } from "react";
import { addFeed, removeFeed } from "@/app/actions/onboarding";
import { InfoTooltip } from "@/components/info-tooltip";
import { SUGGESTED_FEEDS } from "@/lib/feeds/suggested";

export type Feed = { id: string; name: string; url: string };

/** Shared hover/focus hint for finding a source's actual RSS URL. */
export function FeedUrlHelpTooltip() {
  return (
    <InfoTooltip label="How to find a feed URL">
      <p className="mb-1 font-medium">A homepage URL won&apos;t work</p>
      <p>You need the feed&apos;s actual XML endpoint:</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-4">
        <li>Try appending /rss, /rss/news, /feed, or /rss.xml to the site</li>
        <li>View the homepage&apos;s page source and search for &quot;rss+xml&quot;</li>
        <li>Or search &quot;&lt;site name&gt; RSS feed&quot;</li>
      </ul>
    </InfoTooltip>
  );
}

/**
 * Add/remove RSS feeds. Shared between the onboarding wizard's feeds step
 * and the Profile page's feed management section.
 */
export function FeedManager({ initialFeeds }: { initialFeeds: Feed[] }) {
  const [feeds, setFeeds] = useState(initialFeeds);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingSuggestion, setPendingSuggestion] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const addedUrls = new Set(feeds.map((f) => f.url));
  const suggestions = SUGGESTED_FEEDS.filter((s) => !addedUrls.has(s.url));

  function submitFeed(feedName: string, feedUrl: string, onDone?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await addFeed(feedName, feedUrl);
      if (result.ok) {
        setFeeds((prev) => [
          ...prev,
          { id: crypto.randomUUID(), name: feedName, url: feedUrl },
        ]);
        onDone?.();
      } else {
        setError(result.error);
      }
      setPendingSuggestion(null);
    });
  }

  function handleAdd() {
    if (!name.trim() || !url.trim()) return;
    submitFeed(name, url, () => {
      setName("");
      setUrl("");
    });
  }

  function handleAddSuggestion(suggestion: { name: string; url: string }) {
    setPendingSuggestion(suggestion.url);
    submitFeed(suggestion.name, suggestion.url);
  }

  function handleRemove(id: string) {
    const removed = feeds.find((f) => f.id === id);
    setFeeds((prev) => prev.filter((f) => f.id !== id));
    startTransition(async () => {
      const result = await removeFeed(id);
      if (!result.ok && removed) {
        // Deletion failed server-side — put it back rather than leaving
        // the UI showing a feed that's actually still there.
        setFeeds((prev) => [...prev, removed]);
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2">
        {feeds.map((feed) => (
          <div
            key={feed.id}
            className="flex items-center justify-between gap-2 rounded-md border border-divider px-3 py-2 text-sm"
          >
            <span className="truncate">{feed.name}</span>
            <button
              type="button"
              onClick={() => handleRemove(feed.id)}
              className="-m-1.5 shrink-0 p-1.5 text-subtle hover:text-black/70 dark:hover:text-white/70"
              aria-label={`Remove ${feed.name}`}
            >
              ✕
            </button>
          </div>
        ))}
        {feeds.length === 0 && (
          <p className="text-sm text-muted">No feeds yet — add one below.</p>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-divider pt-4">
          <h3 className="text-xs font-medium text-subtle">Popular sources</h3>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s.url}
                type="button"
                onClick={() => handleAddSuggestion(s)}
                disabled={isPending}
                className="rounded-full border border-default px-3 py-1 text-xs disabled:opacity-50"
              >
                {pendingSuggestion === s.url ? "Adding…" : `+ ${s.name}`}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-divider pt-4">
        <div className="flex gap-2">
          <input
            placeholder="Feed name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input flex-1"
          />
          <input
            placeholder="Feed URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="input flex-1"
          />
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="button"
          onClick={handleAdd}
          disabled={isPending || !name.trim() || !url.trim()}
          className="btn-secondary self-start"
        >
          {isPending && !pendingSuggestion ? "Checking feed…" : "Add feed"}
        </button>
      </div>
    </div>
  );
}
