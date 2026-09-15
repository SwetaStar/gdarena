import { NextResponse } from "next/server";
import { callLLM } from "@/lib/llm/callLLM";

// Verifies a user-supplied Gemini key during onboarding. The key is only
// ever in this request's body — it is not logged and nothing here persists
// it (Supabase or otherwise). The caller keeps the key in localStorage.
export async function POST(request: Request) {
  let body: { key?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 }
    );
  }

  const key = body.key;
  if (typeof key !== "string" || !key.trim()) {
    return NextResponse.json(
      { ok: false, error: "Missing API key." },
      { status: 400 }
    );
  }

  const result = await callLLM(
    "gemini",
    key.trim(),
    "Reply with exactly one word: OK"
  );

  return NextResponse.json(result);
}
