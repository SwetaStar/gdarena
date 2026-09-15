"use client";

import type { GDScorecard, TranscriptMessage } from "@/lib/gd/types";

const SPEAKER_LABELS: Record<string, string> = {
  moderator: "Moderator",
  user: "You",
  aggressor: "Aggressor",
  analyst: "Analyst",
  fence_sitter: "Fence-sitter",
};

const SCORE_LABELS: { key: keyof GDScorecard["scores"]; label: string }[] = [
  { key: "content", label: "Content" },
  { key: "assertiveness", label: "Entry / Assertiveness" },
  { key: "data_usage", label: "Data usage" },
  { key: "structure", label: "Structure" },
];

function downloadTranscript(topic: string, transcript: TranscriptMessage[]) {
  const lines = [
    `GDArena — GD transcript`,
    `Topic: ${topic}`,
    `Date: ${new Date().toLocaleString()}`,
    "",
    ...transcript.map((m) => {
      const seconds = Math.round(m.timestamp / 1000);
      const label = SPEAKER_LABELS[m.speaker] ?? m.speaker;
      return `[${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}] ${label}: ${m.content}`;
    }),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gdarena-transcript-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ScorecardView({
  topic,
  scorecard,
  transcript,
  onRestart,
}: {
  topic: string;
  scorecard: GDScorecard;
  transcript: TranscriptMessage[];
  onRestart: () => void;
}) {
  return (
    <div className="flex flex-col gap-5 px-4 py-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold">Your scorecard</h1>
        <p className="text-sm text-muted">{topic}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {SCORE_LABELS.map(({ key, label }) => (
          <div key={key} className="rounded-md border border-divider px-3 py-3">
            <p className="text-xs text-muted">{label}</p>
            <p className="text-2xl font-semibold">
              {scorecard.scores[key]}
              <span className="text-sm font-normal text-subtle">/10</span>
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted">Feedback</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
          {scorecard.feedback.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-divider pt-4">
        <button
          type="button"
          onClick={() => downloadTranscript(topic, transcript)}
          className="btn-secondary"
        >
          Download transcript
        </button>
        <button type="button" onClick={onRestart} className="btn-primary">
          Start another session
        </button>
      </div>
    </div>
  );
}
