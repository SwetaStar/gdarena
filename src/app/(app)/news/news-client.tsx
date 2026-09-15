"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { KnowledgeLevel } from "@/lib/knowledge";
import { useStoredGeminiKey } from "@/lib/gemini-key";
import type { Brief } from "@/lib/briefs/types";
import { ArticleList } from "./article-list";
import { ArticleBrief } from "./article-brief";
import { PdfUpload } from "./pdf-upload";
import type { FeedArticle, FeedResult, SelectedArticle } from "./types";

type View = "list" | "brief" | "pdf";

export function NewsClient({ knowledgeLevel }: { knowledgeLevel: KnowledgeLevel }) {
  const geminiKey = useStoredGeminiKey();

  const [view, setView] = useState<View>("list");
  const [feeds, setFeeds] = useState<FeedResult[]>([]);
  const [feedsLoading, setFeedsLoading] = useState(true);
  const [feedsError, setFeedsError] = useState<string | null>(null);

  const [article, setArticle] = useState<SelectedArticle | null>(null);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/feeds");
        const data: { feeds?: FeedResult[]; error?: string } = await res.json();
        if (cancelled) return;
        if (data.feeds) {
          setFeeds(data.feeds);
        } else {
          setFeedsError(data.error ?? "Couldn't load your feeds.");
        }
      } catch {
        if (!cancelled) setFeedsError("Couldn't load your feeds.");
      } finally {
        if (!cancelled) setFeedsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const generateBrief = useCallback(
    async (target: SelectedArticle) => {
      if (!geminiKey) {
        setBriefLoading(false);
        setBriefError("Add your Gemini key in Profile before generating a brief.");
        return;
      }
      setBriefLoading(true);
      setBriefError(null);
      setBrief(null);

      try {
        const res = await fetch("/api/briefs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            geminiKey,
            knowledgeLevel,
            title: target.title,
            text: target.text,
            articleUrl: target.source === "feed" ? target.link : undefined,
          }),
        });
        const data: { ok: boolean; brief?: Brief; error?: string; rateLimited?: boolean } =
          await res.json();

        if (data.ok && data.brief) {
          setBrief(data.brief);
        } else {
          setBriefError(
            data.rateLimited
              ? "Gemini rate limit hit — wait 30s and try again."
              : data.error ?? "Couldn't generate a brief. Try again."
          );
        }
      } catch {
        setBriefError("Couldn't reach the server. Try again.");
      } finally {
        setBriefLoading(false);
      }
    },
    [geminiKey, knowledgeLevel]
  );

  function openArticle(feed: FeedResult, item: FeedArticle) {
    const selected: SelectedArticle = {
      source: "feed",
      title: item.title,
      link: item.link,
      sourceName: feed.name,
      text: item.snippet || item.title,
    };
    setArticle(selected);
    setView("brief");
    generateBrief(selected);
  }

  function openPdfArticle(title: string, text: string) {
    const selected: SelectedArticle = { source: "pdf", title, text };
    setArticle(selected);
    setView("brief");
    generateBrief(selected);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
      {view === "pdf" && (
        <PdfUpload onExtracted={openPdfArticle} onBack={() => setView("list")} />
      )}

      {view === "brief" && article && (
        <ArticleBrief
          article={article}
          knowledgeLevel={knowledgeLevel}
          geminiKey={geminiKey}
          brief={brief}
          loading={briefLoading}
          error={briefError}
          onRetry={() => generateBrief(article)}
          onBack={() => setView("list")}
        />
      )}

      {view === "list" && (
        <>
          {!geminiKey && (
            <p className="mx-4 mt-4 rounded-md border border-divider px-3 py-2 text-sm">
              Add your Gemini key in{" "}
              <Link href="/profile" className="font-medium underline">
                Profile
              </Link>{" "}
              to generate briefs.
            </p>
          )}

          {feedsLoading && (
            <p className="px-4 py-6 text-sm text-muted">Loading your feeds…</p>
          )}
          {feedsError && (
            <p className="px-4 py-6 text-sm text-red-600 dark:text-red-400">
              {feedsError}
            </p>
          )}
          {!feedsLoading && !feedsError && (
            <ArticleList
              feeds={feeds}
              onSelectArticle={openArticle}
              onUploadPdf={() => setView("pdf")}
            />
          )}
        </>
      )}
    </div>
  );
}
