import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callLLM } from "@/lib/llm/callLLM";
import { extractJson } from "@/lib/llm/parseJson";
import { buildBriefPrompt, truncateArticleText } from "@/lib/briefs/prompts";
import { isBrief } from "@/lib/briefs/types";
import { KNOWLEDGE_LEVELS, type KnowledgeLevel } from "@/lib/knowledge";

type RequestBody = {
  geminiKey?: unknown;
  knowledgeLevel?: unknown;
  title?: unknown;
  text?: unknown;
  /** Present for feed articles (enables the shared cache); omitted for PDF uploads. */
  articleUrl?: unknown;
};

function isKnowledgeLevel(value: unknown): value is KnowledgeLevel {
  return (
    typeof value === "string" &&
    (KNOWLEDGE_LEVELS as readonly string[]).includes(value)
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

  const { geminiKey, knowledgeLevel, title, text, articleUrl } = body;

  if (typeof geminiKey !== "string" || !geminiKey.trim()) {
    return NextResponse.json({ ok: false, error: "Missing Gemini API key." }, { status: 400 });
  }
  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ ok: false, error: "Missing article title." }, { status: 400 });
  }
  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ ok: false, error: "Missing article text." }, { status: 400 });
  }
  const level: KnowledgeLevel = isKnowledgeLevel(knowledgeLevel) ? knowledgeLevel : "intermediate";
  const url = typeof articleUrl === "string" && articleUrl.trim() ? articleUrl.trim() : null;

  // Shared cache lookup — skipped entirely for PDF uploads (no stable
  // public URL, and the text may be a private document that shouldn't be
  // shared across users via the cache).
  if (url) {
    const { data: cached } = await supabase
      .from("article_briefs")
      .select("brief")
      .eq("article_url", url)
      .eq("knowledge_level", level)
      .maybeSingle();

    if (cached?.brief && isBrief(cached.brief)) {
      return NextResponse.json({ ok: true, brief: cached.brief, cached: true });
    }
  }

  const prompt = buildBriefPrompt({
    title,
    text: truncateArticleText(text),
    knowledgeLevel: level,
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

  if (!isBrief(parsed)) {
    return NextResponse.json(
      { ok: false, error: "Gemini returned an unexpected shape. Try again." },
      { status: 502 }
    );
  }

  if (url) {
    // ignoreDuplicates -> INSERT ... ON CONFLICT DO NOTHING: if another
    // request cached this exact (url, level) a moment ago, this is a
    // harmless no-op rather than an error.
    await supabase
      .from("article_briefs")
      .upsert(
        { article_url: url, knowledge_level: level, brief: parsed },
        { onConflict: "article_url,knowledge_level", ignoreDuplicates: true }
      );
  }

  return NextResponse.json({ ok: true, brief: parsed, cached: false });
}
