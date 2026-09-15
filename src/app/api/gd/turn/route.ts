import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callLLM } from "@/lib/llm/callLLM";
import { extractJson } from "@/lib/llm/parseJson";
import { buildBotTurnPrompt } from "@/lib/gd/prompts";
import { isBotTurn, type TranscriptMessage } from "@/lib/gd/types";
import { KNOWLEDGE_LEVELS, type KnowledgeLevel } from "@/lib/knowledge";

// callLLM retries a few times on Gemini's transient 503s — give this route
// more headroom than the platform default so a retried call isn't cut off.
export const maxDuration = 30;

type RequestBody = {
  geminiKey?: unknown;
  topic?: unknown;
  transcript?: unknown;
  knowledgeLevel?: unknown;
};

function isKnowledgeLevel(value: unknown): value is KnowledgeLevel {
  return (
    typeof value === "string" &&
    (KNOWLEDGE_LEVELS as readonly string[]).includes(value)
  );
}

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

  const { geminiKey, topic, transcript, knowledgeLevel } = body;

  if (typeof geminiKey !== "string" || !geminiKey.trim()) {
    return NextResponse.json({ ok: false, error: "Missing Gemini API key." }, { status: 400 });
  }
  if (typeof topic !== "string" || !topic.trim()) {
    return NextResponse.json({ ok: false, error: "Missing topic." }, { status: 400 });
  }
  if (!isTranscript(transcript)) {
    return NextResponse.json({ ok: false, error: "Invalid transcript." }, { status: 400 });
  }

  const level: KnowledgeLevel = isKnowledgeLevel(knowledgeLevel)
    ? knowledgeLevel
    : "intermediate";

  const prompt = buildBotTurnPrompt({ topic, transcript, knowledgeLevel: level });
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

  if (!isBotTurn(parsed)) {
    return NextResponse.json(
      { ok: false, error: "Gemini returned an unexpected shape. Try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, turn: parsed });
}
