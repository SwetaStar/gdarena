"use client";

import { formatRelativeTime } from "@/lib/format-time";
import { getFeedBrand, getContrastText, hexToRgba } from "@/lib/feeds/brand";
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
    <div className="flex flex-col gap-4 px-4 pb-8 pt-4">
      <button type="button" onClick={onUploadPdf} className="btn-secondary self-start">
        Upload a PDF instead
      </button>

      {feeds.map((feed) => {
        const brand = getFeedBrand(feed.url);
        const textColor = brand ? getContrastText(brand.hex) : undefined;

        return (
          <details
            key={feed.id}
            open
            className="group overflow-hidden rounded-lg border border-divider"
          >
            <summary
              className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 select-none marker:content-none [&::-webkit-details-marker]:hidden"
              style={brand ? { backgroundColor: brand.hex, color: textColor } : undefined}
            >
              <span className="flex min-w-0 items-center gap-2">
                {brand && (
                  // eslint-disable-next-line @next/next/no-img-element -- small local logo, not worth next/image config for a handful of static icons
                  <img
                    src={brand.logo}
                    alt=""
                    className="h-6 w-6 shrink-0 rounded object-contain"
                  />
                )}
                <span className="truncate text-sm font-semibold">{feed.name}</span>
              </span>
              <span
                className="flex shrink-0 items-center gap-2 text-xs"
                style={brand ? { color: textColor } : undefined}
              >
                {feed.paywalled && (
                  <span className={brand ? "" : "text-subtle"}>
                    Summary only — upload PDF
                  </span>
                )}
                <span className="transition-transform group-open:rotate-180" aria-hidden>
                  ▾
                </span>
              </span>
            </summary>

            <div style={brand ? { backgroundColor: hexToRgba(brand.hex, 0.07) } : undefined}>
              {feed.error && (
                <p className="px-4 py-3 text-sm text-red-600 dark:text-red-400">
                  Couldn&apos;t load — {feed.error}
                </p>
              )}

              {feed.items && feed.items.length === 0 && (
                <p className="px-4 py-3 text-sm text-muted">No articles right now.</p>
              )}

              {feed.items && feed.items.length > 0 && (
                <ul className="flex flex-col">
                  {feed.items.map((article) => (
                    <li key={article.link}>
                      <button
                        type="button"
                        onClick={() => onSelectArticle(feed, article)}
                        className="flex w-full flex-col gap-0.5 border-t border-divider px-4 py-3 text-left transition-colors hover:bg-black/[0.03] dark:hover:bg-white/5"
                      >
                        <span className="text-sm font-medium leading-snug">
                          {article.title}
                        </span>
                        <span className="text-xs text-muted">
                          {article.publishedAt
                            ? formatRelativeTime(article.publishedAt)
                            : ""}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </details>
        );
      })}

      {feeds.length === 0 && (
        <p className="px-4 text-sm text-muted">
          No feeds yet — add some from your Profile tab.
        </p>
      )}
    </div>
  );
}
