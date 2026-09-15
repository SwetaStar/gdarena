"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useStoredGeminiKey } from "@/lib/gemini-key";
import type { KnowledgeLevel } from "@/lib/knowledge";
import type { PrepCard } from "@/lib/gd/types";

export function PrepCardView({
  topic,
  knowledgeLevel,
  onStart,
  onBack,
}: {
  topic: string;
  knowledgeLevel: KnowledgeLevel;
  onStart: (prepCard: PrepCard) => void;
  onBack: () => void;
}) {
  const geminiKey = useStoredGeminiKey();
  const [prepCard, setPrepCard] = useState<PrepCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  async function generate() {
    if (!geminiKey) {
      setError("Missing Gemini key.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/gd/prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ geminiKey, topic, knowledgeLevel }),
      });
      const data: { ok: boolean; prepCard?: PrepCard; error?: string; rateLimited?: boolean } =
        await res.json();

      if (data.ok && data.prepCard) {
        setPrepCard(data.prepCard);
      } else {
        setError(
          data.rateLimited
            ? "Gemini rate limit hit — wait 30s and try again."
            : data.error ?? "Couldn't generate your prep card."
        );
      }
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <h1 className="text-lg font-semibold">Prep</h1>
        <p className="text-sm text-muted">{topic}</p>
      </div>

      {loading && <p className="text-sm text-muted">Preparing your notes…</p>}

      {!loading && error && (
        <div className="flex flex-col items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          <span>{error}</span>
          <button
            type="button"
            onClick={generate}
            className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium dark:border-red-800"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && prepCard && (
        <>
          <Section title="Opening line — first 30 seconds">
            <p className="text-sm leading-relaxed">&ldquo;{prepCard.opening_line}&rdquo;</p>
          </Section>

          <Section title="PREP structure — worked example on this topic">
            <div className="flex flex-col gap-2 text-sm leading-relaxed">
              <p>
                <span className="font-semibold text-muted">Point — </span>
                {prepCard.prep_example.point}
              </p>
              <p>
                <span className="font-semibold text-muted">Reason — </span>
                {prepCard.prep_example.reason}
              </p>
              <p>
                <span className="font-semibold text-muted">Example — </span>
                {prepCard.prep_example.example}
              </p>
              <p>
                <span className="font-semibold text-muted">Point (restated) — </span>
                {prepCard.prep_example.concluding_point}
              </p>
            </div>
          </Section>

          <Section title="Entry phrases">
            <div className="flex flex-wrap gap-2">
              {prepCard.entry_phrases.map((phrase) => (
                <span
                  key={phrase}
                  className="rounded-full border border-default px-3 py-1 text-xs"
                >
                  {phrase}
                </span>
              ))}
            </div>
          </Section>

          <Section title="Closing line">
            <p className="text-sm leading-relaxed">&ldquo;{prepCard.closing_line}&rdquo;</p>
          </Section>

          <button
            type="button"
            onClick={() => onStart(prepCard)}
            className="btn-primary mt-2 self-start"
          >
            Start the 8-minute session
          </button>
        </>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 border-t border-divider pt-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-subtle">{title}</h2>
      {children}
    </div>
  );
}
