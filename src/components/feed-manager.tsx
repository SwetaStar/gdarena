"use client";

import { useState, useTransition } from "react";
import { addFeed, removeFeed } from "@/app/actions/onboarding";

export type Feed = { id: string; name: string; url: string };

const inputClass =
  "rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/40";

/**
 * Add/remove RSS feeds. Shared between the onboarding wizard's feeds step
 * and the Profile page's feed management section.
 */
export function FeedManager({ initialFeeds }: { initialFeeds: Feed[] }) {
  const [feeds, setFeeds] = useState(initialFeeds);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    if (!name.trim() || !url.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await addFeed(name, url);
        setFeeds((prev) => [...prev, { id: crypto.randomUUID(), name, url }]);
        setName("");
        setUrl("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not add feed.");
      }
    });
  }

  function handleRemove(id: string) {
    setFeeds((prev) => prev.filter((f) => f.id !== id));
    startTransition(async () => {
      await removeFeed(id);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2">
        {feeds.map((feed) => (
          <div
            key={feed.id}
            className="flex items-center justify-between gap-2 rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/15"
          >
            <span className="truncate">{feed.name}</span>
            <button
              type="button"
              onClick={() => handleRemove(feed.id)}
              className="shrink-0 text-black/40 hover:text-black/70 dark:text-white/40 dark:hover:text-white/70"
              aria-label={`Remove ${feed.name}`}
            >
              ✕
            </button>
          </div>
        ))}
        {feeds.length === 0 && (
          <p className="text-sm text-black/50 dark:text-white/50">
            No feeds yet — add one below.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-black/10 pt-4 dark:border-white/15">
        <div className="flex gap-2">
          <input
            placeholder="Feed name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`${inputClass} flex-1`}
          />
          <input
            placeholder="Feed URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className={`${inputClass} flex-1`}
          />
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="button"
          onClick={handleAdd}
          disabled={isPending || !name.trim() || !url.trim()}
          className="self-start rounded-md border border-black/15 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-white/20"
        >
          {isPending ? "Checking feed…" : "Add feed"}
        </button>
      </div>
    </div>
  );
}
