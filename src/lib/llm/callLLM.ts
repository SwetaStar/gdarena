// Single chokepoint for every LLM call in the app. Add a new provider by
// adding a case here — callers never change. Keeps Gemini's free-tier
// rate limits and error shapes in one place instead of scattered per-feature.

export type LLMProvider = "gemini";

export type LLMResult =
  | { ok: true; text: string }
  | { ok: false; error: string; rateLimited?: boolean };

// History (all verified live against real API responses, not memory):
// - "gemini-2.0-flash" 404s as of 2026-09 — free tier moved past 2.x.
// - Switched to "gemini-flash-latest" (Google's self-updating alias),
//   which resolved to "gemini-3.8-flash". That turned out to have a free
//   tier quota of just 20 requests/DAY (confirmed via the 429 response's
//   own quota details: quotaId
//   "GenerateRequestsPerDayPerProjectPerModel-FreeTier", quotaValue "20")
//   — easily exhausted by a single GD Room session, let alone real usage.
//   The "-latest" alias gives no control over which model (and thus which
//   quota tier) you land on, which is exactly the risk that bit us here.
// - Pinned to "gemini-3.6-flash" instead: Google's own 404 error message
//   for a different deprecated model explicitly pointed here ("update
//   your code to use models/gemini-3.6-flash"), and it's confirmed
//   working for both plain and responseMimeType: "application/json"
//   calls. Pinning a specific model that Google itself calls out as the
//   stable target is a more predictable choice than an alias that could
//   silently land on another low-quota model next time Google ships one.
const GEMINI_MODEL = "gemini-3.6-flash";

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
