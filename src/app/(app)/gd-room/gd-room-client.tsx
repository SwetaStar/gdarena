"use client";

import { useState } from "react";
import type { KnowledgeLevel } from "@/lib/knowledge";
import type { GDScorecard, TranscriptMessage } from "@/lib/gd/types";
import { TopicPicker } from "./topic-picker";
import { SessionView } from "./session-view";
import { ScorecardView } from "./scorecard-view";

type View = "topic" | "session" | "scorecard";

export function GDRoomClient({ knowledgeLevel }: { knowledgeLevel: KnowledgeLevel }) {
  const [view, setView] = useState<View>("topic");
  const [topic, setTopic] = useState<string | null>(null);
  const [scorecard, setScorecard] = useState<GDScorecard | null>(null);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);

  function startSession(chosenTopic: string) {
    setTopic(chosenTopic);
    setView("session");
  }

  function finishSession(finalTranscript: TranscriptMessage[], result: GDScorecard) {
    setTranscript(finalTranscript);
    setScorecard(result);
    setView("scorecard");
  }

  function restart() {
    setTopic(null);
    setScorecard(null);
    setTranscript([]);
    setView("topic");
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
      {view === "topic" && <TopicPicker onStart={startSession} />}
      {view === "session" && topic && (
        <SessionView
          topic={topic}
          knowledgeLevel={knowledgeLevel}
          onFinish={finishSession}
          onExit={restart}
        />
      )}
      {view === "scorecard" && topic && scorecard && (
        <ScorecardView
          topic={topic}
          scorecard={scorecard}
          transcript={transcript}
          onRestart={restart}
        />
      )}
    </div>
  );
}
