import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callLLM } from "@/lib/llm/callLLM";
import { extractJson } from "@/lib/llm/parseJson";
import { buildScorecardPrompt } from "@/lib/gd/prompts";
import { isGDScorecard, type TranscriptMessage } from "@/lib/gd/types";

// callLLM retries a few times on Gemini's transient 503s — give this route
// more headroom than the platform default so a retried call isn't cut off.
export const maxDuration = 30;

type RequestBody = {
  geminiKey?: unknown;
  topic?: unknown;
  transcript?: unknown;
  userStats?: unknown;
};

function isTranscript(value: unknown): value is TranscriptMessage[] {
  return (
    Array.isArray(value) &&
    value.every(
      (m) =>
        m &&
        typeof m === "object" &&
        typeof (m as TranscriptMessage).speaker === "string" &&
        typeof (m as TranscriptMessage).content === "string"
    )
  );
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const { geminiKey, topic, transcript, userStats } = body;

  if (typeof geminiKey !== "string" || !geminiKey.trim()) {
    return NextResponse.json({ ok: false, error: "Missing Gemini API key." }, { status: 400 });
  }
  if (typeof topic !== "string" || !topic.trim()) {
    return NextResponse.json({ ok: false, error: "Missing topic." }, { status: 400 });
  }
  if (!isTranscript(transcript)) {
    return NextResponse.json({ ok: false, error: "Invalid transcript." }, { status: 400 });
  }

  const stats = userStats as { messageCount?: unknown; firstMessageAtSeconds?: unknown } | undefined;

  const prompt = buildScorecardPrompt({
    topic,
    transcript,
    userStats: {
      messageCount: typeof stats?.messageCount === "number" ? stats.messageCount : 0,
      firstMessageAtSeconds:
        typeof stats?.firstMessageAtSeconds === "number" ? stats.firstMessageAtSeconds : null,
    },
  });

  const result = await callLLM("gemini", geminiKey.trim(), prompt, { json: true });

  if (!result.ok) {
    const status = result.rateLimited ? 429 : 502;
    return NextResponse.json(
      { ok: false, error: result.error, rateLimited: result.rateLimited ?? false },
      { status }
    );
  }

  let parsed: unknown;
  try {
    parsed = extractJson(result.text);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Gemini returned something we couldn't parse. Try again." },
      { status: 502 }
    );
  }

  if (!isGDScorecard(parsed)) {
    return NextResponse.json(
      { ok: false, error: "Gemini returned an unexpected shape. Try again." },
      { status: 502 }
    );
  }

  // Store only the outcome — topic, scores, feedback. Never the transcript.
  const { error: dbError } = await supabase.from("sessions").insert({
    user_id: user.id,
    topic,
    scores: parsed.scores,
    feedback: parsed.feedback,
  });

  if (dbError) {
    // Don't let a DB hiccup lose feedback the user already paid a Gemini
    // call for — still return it, just flag that it wasn't saved.
    return NextResponse.json({ ok: true, scorecard: parsed, saved: false, saveError: dbError.message });
  }

  return NextResponse.json({ ok: true, scorecard: parsed, saved: true });
}
