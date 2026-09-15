import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callLLM } from "@/lib/llm/callLLM";
import { buildChatPrompt, truncateArticleText } from "@/lib/briefs/prompts";
import { KNOWLEDGE_LEVELS, type KnowledgeLevel } from "@/lib/knowledge";

// callLLM retries a few times on Gemini's transient 503s — give this route
// more headroom than the platform default so a retried call isn't cut off
// mid-request.
export const maxDuration = 30;

const MAX_QUESTIONS = 5;

type ChatMessage = { role: "user" | "assistant"; content: string };

type RequestBody = {
  geminiKey?: unknown;
  knowledgeLevel?: unknown;
  title?: unknown;
  text?: unknown;
  question?: unknown;
  history?: unknown;
};

function isKnowledgeLevel(value: unknown): value is KnowledgeLevel {
  return (
    typeof value === "string" &&
    (KNOWLEDGE_LEVELS as readonly string[]).includes(value)
  );
}

function isHistory(value: unknown): value is ChatMessage[] {
  return (
    Array.isArray(value) &&
    value.every(
      (m) =>
        m &&
        typeof m === "object" &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string"
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

  const { geminiKey, knowledgeLevel, title, text, question, history } = body;

  if (typeof geminiKey !== "string" || !geminiKey.trim()) {
    return NextResponse.json({ ok: false, error: "Missing Gemini API key." }, { status: 400 });
  }
  if (typeof title !== "string" || typeof text !== "string") {
    return NextResponse.json({ ok: false, error: "Missing article context." }, { status: 400 });
  }
  if (typeof question !== "string" || !question.trim()) {
    return NextResponse.json({ ok: false, error: "Missing question." }, { status: 400 });
  }

  const chatHistory = isHistory(history) ? history : [];
  const askedSoFar = chatHistory.filter((m) => m.role === "user").length;
  if (askedSoFar >= MAX_QUESTIONS) {
    return NextResponse.json(
      { ok: false, error: `Chat is capped at ${MAX_QUESTIONS} messages per article.` },
      { status: 400 }
    );
  }

  const level: KnowledgeLevel = isKnowledgeLevel(knowledgeLevel) ? knowledgeLevel : "intermediate";

  const prompt = buildChatPrompt({
    title,
    text: truncateArticleText(text),
    knowledgeLevel: level,
    history: chatHistory,
    question,
  });

  const result = await callLLM("gemini", geminiKey.trim(), prompt);

  if (!result.ok) {
    const status = result.rateLimited ? 429 : 502;
    return NextResponse.json(
      { ok: false, error: result.error, rateLimited: result.rateLimited ?? false },
      { status }
    );
  }

  return NextResponse.json({ ok: true, answer: result.text.trim() });
}
