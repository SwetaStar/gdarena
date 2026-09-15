"use client";

import { formatRelativeTime } from "@/lib/format-time";
import type { FeedArticle, FeedResult } from "./types";

export function ArticleList({
  feeds,
  onSelectArticle,
  onUploadPdf,
}: {
  feeds: FeedResult[];
  onSelectArticle: (feed: FeedResult, article: FeedArticle) => void;
  onUploadPdf: () => void;
}) {
  return (
    <div className="flex flex-col gap-6 pb-8">
      <button
        type="button"
        onClick={onUploadPdf}
        className="mx-4 mt-4 self-start rounded-md border border-black/15 px-3 py-1.5 text-sm dark:border-white/20"
      >
        Upload a PDF instead
      </button>

      {feeds.map((feed) => (
        <section key={feed.id} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between px-4">
            <h2 className="text-sm font-semibold">{feed.name}</h2>
            {feed.paywalled && (
              <span className="text-xs text-black/40 dark:text-white/40">
                Summary only — upload PDF for full analysis
              </span>
            )}
          </div>

          {feed.error && (
            <p className="px-4 text-sm text-red-600 dark:text-red-400">
              Couldn&apos;t load — {feed.error}
            </p>
          )}

          {feed.items && feed.items.length === 0 && (
            <p className="px-4 text-sm text-black/50 dark:text-white/50">
              No articles right now.
            </p>
          )}

          {feed.items && feed.items.length > 0 && (
            <ul className="flex flex-col">
              {feed.items.map((article) => (
                <li key={article.link}>
                  <button
                    type="button"
                    onClick={() => onSelectArticle(feed, article)}
                    className="flex w-full flex-col gap-0.5 border-b border-black/5 px-4 py-3 text-left transition-colors hover:bg-black/[0.03] dark:border-white/10 dark:hover:bg-white/5"
                  >
                    <span className="text-sm font-medium leading-snug">
                      {article.title}
                    </span>
                    <span className="text-xs text-black/45 dark:text-white/45">
                      {feed.name}
                      {article.publishedAt
                        ? ` · ${formatRelativeTime(article.publishedAt)}`
                        : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      {feeds.length === 0 && (
        <p className="px-4 text-sm text-black/50 dark:text-white/50">
          No feeds yet — add some from your Profile tab.
        </p>
      )}
    </div>
  );
}
