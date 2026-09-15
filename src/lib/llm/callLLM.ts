// Single chokepoint for every LLM call in the app. Add a new provider by
// adding a case here — callers never change. Keeps Gemini's free-tier
// rate limits and error shapes in one place instead of scattered per-feature.

export type LLMProvider = "gemini";

export type LLMResult =
  | { ok: true; text: string }
  | { ok: false; error: string; rateLimited?: boolean };

// "gemini-2.0-flash" 404s as of 2026-09 — Google has moved the free tier
// past 2.x entirely. Verified live against GET /v1beta/models with a real
// key (see git history/PR notes): "gemini-flash-latest" is Google's own
// self-updating alias for the current flash model (resolved to
// "gemini-3.8-flash" at verification time) and confirmed working for both
// plain generateContent and responseMimeType: "application/json" calls.
// Using the alias rather than a pinned dated snapshot means this doesn't
// go stale again the next time Google ships a flash model — pin to a
// specific dated model instead if you want deterministic behavior over
// auto-updating.
const GEMINI_MODEL = "gemini-flash-latest";

/**
 * Calls the given provider with the given API key. Runs server-side only —
 * the key arrives in the request body of a server Route Handler and is
 * never logged or persisted. See src/app/api/llm/route.ts.
 */
export type CallLLMOptions = {
  /** Ask the provider to constrain output to valid JSON (Gemini supports this natively). */
  json?: boolean;
};

export async function callLLM(
  provider: LLMProvider,
  apiKey: string,
  prompt: string,
  options: CallLLMOptions = {}
): Promise<LLMResult> {
  if (!apiKey) {
    return { ok: false, error: "Missing API key." };
  }
  if (!prompt) {
    return { ok: false, error: "Missing prompt." };
  }

  switch (provider) {
    case "gemini":
      return callGemini(apiKey, prompt, options);
    default:
      return { ok: false, error: `Unsupported provider: ${provider satisfies never}` };
  }
}

// Google's free-tier flash model returns 503 ("model overloaded") fairly
// often under load — confirmed live: three calls one second apart came
// back 503, 200, 503. It's transient, not a real failure, so retry a
// couple of times with a short delay before surfacing it as an error.
const MAX_OVERLOAD_ATTEMPTS = 3;
const OVERLOAD_RETRY_DELAY_MS = 800;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGemini(
  apiKey: string,
  prompt: string,
  options: CallLLMOptions
): Promise<LLMResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

  for (let attempt = 1; attempt <= MAX_OVERLOAD_ATTEMPTS; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          ...(options.json
            ? { generationConfig: { responseMimeType: "application/json" } }
            : {}),
        }),
      });
    } catch {
      return {
        ok: false,
        error: "Could not reach Gemini. Check your connection and try again.",
      };
    }

    if (res.status === 429) {
      return {
        ok: false,
        error: "Gemini rate limit hit — wait 30s and try again.",
        rateLimited: true,
      };
    }

    if (res.status === 503 && attempt < MAX_OVERLOAD_ATTEMPTS) {
      await sleep(OVERLOAD_RETRY_DELAY_MS * attempt);
      continue;
    }

    if (!res.ok) {
      // Surface the provider's status without echoing the request (which
      // could include the key in a future provider's error payload).
      return { ok: false, error: `Gemini request failed (${res.status}).` };
    }

    const data = await res.json();
    const text: unknown = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (typeof text !== "string" || !text) {
      return { ok: false, error: "Gemini returned an empty response." };
    }

    return { ok: true, text };
  }

  // Unreachable — the loop always returns on its last iteration.
  return { ok: false, error: "Gemini request failed." };
}
