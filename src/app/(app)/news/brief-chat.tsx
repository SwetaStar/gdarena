"use client";

import { useState } from "react";
import type { SelectedArticle } from "./types";
import type { KnowledgeLevel } from "@/lib/knowledge";

const MAX_QUESTIONS = 5;

type ChatMessage = { role: "user" | "assistant"; content: string };

export function BriefChat({
  article,
  knowledgeLevel,
  geminiKey,
}: {
  article: SelectedArticle;
  knowledgeLevel: KnowledgeLevel;
  geminiKey: string | null;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const askedSoFar = messages.filter((m) => m.role === "user").length;
  const remaining = MAX_QUESTIONS - askedSoFar;
  const capped = remaining <= 0;

  async function handleAsk() {
    const trimmed = question.trim();
    if (!trimmed || capped) return;
    if (!geminiKey) {
      setError("Add your Gemini key in Profile first.");
      return;
    }

    setPending(true);
    setError(null);
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setQuestion("");

    try {
      const res = await fetch("/api/briefs/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          geminiKey,
          knowledgeLevel,
          title: article.title,
          text: article.text,
          question: trimmed,
          history: messages,
        }),
      });
      const data: { ok: boolean; answer?: string; error?: string; rateLimited?: boolean } =
        await res.json();

      if (data.ok && data.answer) {
        setMessages([...nextMessages, { role: "assistant", content: data.answer }]);
      } else {
        setError(
          data.rateLimited
            ? "Gemini rate limit hit — wait 30s and try again."
            : data.error ?? "Couldn't get an answer. Try again."
        );
      }
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t border-black/10 pt-4 dark:border-white/15">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">Explain this to me</h3>
        <span className="text-xs text-black/40 dark:text-white/40">
          {capped ? "No messages left" : `${remaining} message${remaining === 1 ? "" : "s"} left`}
        </span>
      </div>

      {messages.length > 0 && (
        <div className="flex flex-col gap-2">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`rounded-md px-3 py-2 text-sm ${
                m.role === "user"
                  ? "self-end bg-foreground text-background"
                  : "self-start bg-black/[0.04] dark:bg-white/10"
              }`}
            >
              {m.content}
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {!capped && (
        <div className="flex gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAsk();
            }}
            placeholder="Ask a follow-up question…"
            disabled={pending}
            className="flex-1 rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 disabled:opacity-50 dark:border-white/20 dark:focus:border-white/40"
          />
          <button
            type="button"
            onClick={handleAsk}
            disabled={pending || !question.trim()}
            className="rounded-md border border-black/15 px-3 py-2 text-sm disabled:opacity-50 dark:border-white/20"
          >
            {pending ? "…" : "Ask"}
          </button>
        </div>
      )}
    </div>
  );
}
