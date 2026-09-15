"use client";

import { useEffect, useRef, useState } from "react";
import { useStoredGeminiKey } from "@/lib/gemini-key";
import type { KnowledgeLevel } from "@/lib/knowledge";
import type { GDScorecard, Speaker, TranscriptMessage } from "@/lib/gd/types";

const SESSION_SECONDS = 8 * 60;
const WARNING_AT_REMAINING = 60;

const SPEAKER_META: Record<Speaker, { label: string; color: string }> = {
  moderator: { label: "Moderator", color: "text-foreground" },
  user: { label: "You", color: "text-foreground" },
  aggressor: { label: "Aggressor", color: "text-red-600 dark:text-red-400" },
  analyst: { label: "Analyst", color: "text-blue-600 dark:text-blue-400" },
  fence_sitter: { label: "Fence-sitter", color: "text-amber-600 dark:text-amber-500" },
};

function makeMessage(speaker: Speaker, content: string, sessionStart: number): TranscriptMessage {
  return { id: crypto.randomUUID(), speaker, content, timestamp: Date.now() - sessionStart };
}

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function SessionView({
  topic,
  knowledgeLevel,
  onFinish,
  onExit,
}: {
  topic: string;
  knowledgeLevel: KnowledgeLevel;
  onFinish: (transcript: TranscriptMessage[], scorecard: GDScorecard) => void;
  onExit: () => void;
}) {
  const geminiKey = useStoredGeminiKey();
  const sessionStartRef = useRef(Date.now());
  const startedRef = useRef(false);
  const endedRef = useRef(false);
  const messagesRef = useRef<TranscriptMessage[]>([]);
  const remainingRef = useRef(SESSION_SECONDS);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [remaining, setRemaining] = useState(SESSION_SECONDS);
  const [input, setInput] = useState("");
  const [botsPending, setBotsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeUp, setTimeUp] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, botsPending]);

  async function requestBotTurn(transcriptSoFar: TranscriptMessage[]) {
    if (!geminiKey) return;
    setBotsPending(true);
    setError(null);
    try {
      const res = await fetch("/api/gd/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ geminiKey, topic, transcript: transcriptSoFar, knowledgeLevel }),
      });
      const data: {
        ok: boolean;
        turn?: { aggressor: string; analyst: string; fence_sitter: string };
        error?: string;
        rateLimited?: boolean;
      } = await res.json();

      if (data.ok && data.turn) {
        const start = sessionStartRef.current;
        setMessages((prev) => [
          ...prev,
          makeMessage("aggressor", data.turn!.aggressor, start),
          makeMessage("analyst", data.turn!.analyst, start),
          makeMessage("fence_sitter", data.turn!.fence_sitter, start),
        ]);
      } else {
        setError(
          data.rateLimited
            ? "Gemini rate limit hit — wait 30s and try again."
            : data.error ?? "Couldn't get bot responses."
        );
      }
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setBotsPending(false);
    }
  }

  // Opening: moderator intro, then the bots' opening reactions.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const opening = makeMessage(
      "moderator",
      `Today's topic: "${topic}". You have 8 minutes — jump in whenever you're ready.`,
      sessionStartRef.current
    );
    setMessages([opening]);
    requestBotTurn([opening]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown — the actual decrement lives in a ref so the 1-minute-warning
  // and time's-up checks can run as plain statements inside the timer's
  // tick callback (an async callback the effect merely schedules) rather
  // than reactively in an effect body watching `remaining`.
  useEffect(() => {
    if (timeUp) return;
    const interval = setInterval(() => {
      remainingRef.current -= 1;
      setRemaining(remainingRef.current);

      if (remainingRef.current === WARNING_AT_REMAINING) {
        setMessages((prev) => [
          ...prev,
          makeMessage("moderator", "One minute left — wrap up your point.", sessionStartRef.current),
        ]);
      }
      if (remainingRef.current <= 0) {
        clearInterval(interval);
        setTimeUp(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [timeUp]);

  // Once time is up, generate the scorecard (once).
  useEffect(() => {
    if (!timeUp || endedRef.current) return;
    endedRef.current = true;
    void generateScorecard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUp]);

  async function generateScorecard() {
    setScoring(true);
    setScoreError(null);

    if (!geminiKey) {
      setScoreError("Missing Gemini key.");
      setScoring(false);
      endedRef.current = false;
      return;
    }

    const finalTranscript = messagesRef.current;
    const userMessages = finalTranscript.filter((m) => m.speaker === "user");
    const firstUserMessage = userMessages[0];

    try {
      const res = await fetch("/api/gd/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          geminiKey,
          topic,
          transcript: finalTranscript,
          userStats: {
            messageCount: userMessages.length,
            firstMessageAtSeconds: firstUserMessage
              ? Math.round(firstUserMessage.timestamp / 1000)
              : null,
          },
        }),
      });
      const data: { ok: boolean; scorecard?: GDScorecard; error?: string; rateLimited?: boolean } =
        await res.json();

      if (data.ok && data.scorecard) {
        onFinish(finalTranscript, data.scorecard);
      } else {
        setScoreError(
          data.rateLimited
            ? "Gemini rate limit hit — wait 30s and try again."
            : data.error ?? "Couldn't generate your scorecard."
        );
        setScoring(false);
        endedRef.current = false;
      }
    } catch {
      setScoreError("Couldn't reach the server. Try again.");
      setScoring(false);
      endedRef.current = false;
    }
  }

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || timeUp) return;
    setInput("");
    const next = [...messagesRef.current, makeMessage("user", trimmed, sessionStartRef.current)];
    setMessages(next);
    requestBotTurn(next);
  }

  function handleEndEarly() {
    if (timeUp) return;
    setTimeUp(true);
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-divider px-4 py-3">
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold">{topic}</span>
          <span className="text-xs text-muted">GD Room</span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`font-mono text-sm ${remaining <= WARNING_AT_REMAINING ? "text-red-600 dark:text-red-400" : "text-muted"}`}
          >
            {formatClock(remaining)}
          </span>
          {!timeUp ? (
            <button type="button" onClick={handleEndEarly} className="btn-secondary">
              End & score
            </button>
          ) : (
            <button type="button" onClick={onExit} className="btn-secondary">
              Exit
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {messages.map((m) => {
          const meta = SPEAKER_META[m.speaker];
          if (m.speaker === "moderator") {
            return (
              <p key={m.id} className="text-center text-xs italic text-subtle">
                {m.content}
              </p>
            );
          }
          const isUser = m.speaker === "user";
          return (
            <div key={m.id} className={`flex max-w-[85%] flex-col gap-0.5 ${isUser ? "self-end items-end" : "self-start"}`}>
              {!isUser && (
                <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
              )}
              <div
                className={`rounded-md px-3 py-2 text-sm ${
                  isUser
                    ? "bg-foreground text-background"
                    : "bg-black/[0.04] dark:bg-white/10"
                }`}
              >
                {m.content}
              </div>
            </div>
          );
        })}

        {botsPending && (
          <p className="self-start text-xs text-subtle">Bots are responding…</p>
        )}

        {error && !timeUp && (
          <div className="flex flex-col items-start gap-2 self-start rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => requestBotTurn(messagesRef.current)}
              className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium dark:border-red-800"
            >
              Retry
            </button>
          </div>
        )}

        {timeUp && (
          <div className="mt-2 flex flex-col items-center gap-2 self-center text-center">
            {scoring && !scoreError && (
              <p className="text-sm text-muted">Time&apos;s up — generating your scorecard…</p>
            )}
            {scoreError && (
              <div className="flex flex-col items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                <span>{scoreError}</span>
                <button
                  type="button"
                  onClick={() => {
                    endedRef.current = true;
                    void generateScorecard();
                  }}
                  className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium dark:border-red-800"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 border-t border-divider px-4 py-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder={timeUp ? "Session ended" : "Make your point…"}
          disabled={timeUp}
          className="input flex-1"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={timeUp || !input.trim()}
          className="btn-secondary"
        >
          Send
        </button>
      </div>
    </div>
  );
}
