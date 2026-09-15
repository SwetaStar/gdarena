"use client";

import { useState, type ReactNode } from "react";
import type { Brief } from "@/lib/briefs/types";
import type { KnowledgeLevel } from "@/lib/knowledge";
import type { SelectedArticle } from "./types";
import { BriefChat } from "./brief-chat";

type View = "plain" | "mba";

export function ArticleBrief({
  article,
  knowledgeLevel,
  geminiKey,
  brief,
  loading,
  error,
  onRetry,
  onBack,
}: {
  article: SelectedArticle;
  knowledgeLevel: KnowledgeLevel;
  geminiKey: string | null;
  brief: Brief | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onBack: () => void;
}) {
  const [view, setView] = useState<View>("plain");

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <button
        type="button"
        onClick={onBack}
        className="-m-1.5 self-start p-1.5 text-sm text-muted"
      >
        ← Back
      </button>

      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold leading-snug">{article.title}</h1>
        {article.source === "feed" && (
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted underline"
          >
            {article.sourceName} — open original
          </a>
        )}
      </div>

      {loading && <p className="text-sm text-muted">Generating your brief…</p>}

      {!loading && error && (
        <div className="flex flex-col items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          <span>{error}</span>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium dark:border-red-800"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && brief && (
        <>
          <div className="flex gap-1 rounded-md bg-black/5 p-1 text-sm dark:bg-white/10">
            {(["plain", "mba"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`flex-1 rounded px-3 py-1.5 font-medium transition-colors ${
                  view === v
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted"
                }`}
              >
                {v === "plain" ? "Plain" : "MBA"}
              </button>
            ))}
          </div>

          {view === "plain" ? <PlainView brief={brief} /> : <MbaView brief={brief} />}

          <BriefChat article={article} knowledgeLevel={knowledgeLevel} geminiKey={geminiKey} />
        </>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-subtle">
        {title}
      </h3>
      {children}
    </div>
  );
}

function PlainView({ brief }: { brief: Brief }) {
  const { plain } = brief;
  return (
    <div className="flex flex-col gap-4">
      <Section title="What happened">
        <p className="text-sm leading-relaxed">{plain.what_happened}</p>
      </Section>
      <Section title="Why it matters">
        <p className="text-sm leading-relaxed">{plain.why_it_matters}</p>
      </Section>
      {plain.key_terms.length > 0 && (
        <Section title="Key terms">
          <dl className="flex flex-col gap-2">
            {plain.key_terms.map((kt) => (
              <div key={kt.term} className="text-sm">
                <dt className="font-medium">{kt.term}</dt>
                <dd className="text-muted">{kt.meaning}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}
    </div>
  );
}

function MbaView({ brief }: { brief: Brief }) {
  const { mba } = brief;
  return (
    <div className="flex flex-col gap-4">
      <Section title="What happened">
        <p className="text-sm leading-relaxed">{mba.what_happened}</p>
      </Section>
      <Section title="Why it matters">
        <p className="text-sm leading-relaxed">{mba.why_it_matters}</p>
      </Section>
      <Section title="Arguments for">
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
          {mba.arguments_for.map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ul>
      </Section>
      <Section title="Arguments against">
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
          {mba.arguments_against.map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ul>
      </Section>
      <Section title="Data points">
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
          {mba.data_points.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      </Section>
      {mba.framework_lens.name && (
        <Section title="Framework lens">
          <p className="text-sm leading-relaxed">
            <span className="font-medium">{mba.framework_lens.name}</span> —{" "}
            {mba.framework_lens.why}
          </p>
        </Section>
      )}
    </div>
  );
}
