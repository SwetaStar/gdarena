"use client";

import { useState } from "react";
import Link from "next/link";
import { GD_TOPICS } from "@/lib/gd/topics";
import { useStoredGeminiKey } from "@/lib/gemini-key";

export function TopicPicker({ onStart }: { onStart: (topic: string) => void }) {
  const geminiKey = useStoredGeminiKey();
  const [custom, setCustom] = useState("");

  function randomTopic() {
    const topic = GD_TOPICS[Math.floor(Math.random() * GD_TOPICS.length)];
    onStart(topic);
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold">GD Room</h1>
        <p className="text-sm text-muted">
          An 8-minute practice group discussion against 3 bots — Aggressor,
          Analyst, and Fence-sitter — with a moderator keeping time. You get a
          scorecard at the end; only the topic, scores, and feedback are
          saved, never the transcript.
        </p>
      </div>

      {!geminiKey && (
        <p className="rounded-md border border-divider px-3 py-2 text-sm">
          Add your Gemini key in{" "}
          <Link href="/profile" className="font-medium underline">
            Profile
          </Link>{" "}
          to start a session.
        </p>
      )}

      <button
        type="button"
        onClick={randomTopic}
        disabled={!geminiKey}
        className="btn-primary self-start"
      >
        Surprise me with a topic
      </button>

      <div className="flex flex-col gap-2 border-t border-divider pt-4">
        <h2 className="text-sm font-medium text-muted">Or pick a topic</h2>
        <div className="flex flex-col gap-2">
          {GD_TOPICS.map((topic) => (
            <button
              key={topic}
              type="button"
              onClick={() => onStart(topic)}
              disabled={!geminiKey}
              className="rounded-md border border-default px-3 py-2 text-left text-sm transition-colors hover:bg-black/[0.03] disabled:opacity-50 dark:hover:bg-white/5"
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-divider pt-4">
        <h2 className="text-sm font-medium text-muted">Or type your own</h2>
        <div className="flex gap-2">
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Your GD topic"
            className="input flex-1"
          />
          <button
            type="button"
            onClick={() => custom.trim() && onStart(custom.trim())}
            disabled={!geminiKey || !custom.trim()}
            className="btn-secondary"
          >
            Start
          </button>
        </div>
      </div>
    </div>
  );
}
