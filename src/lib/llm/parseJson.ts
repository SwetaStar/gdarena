/**
 * Gemini is asked for responseMimeType: "application/json", which is
 * reliable but not guaranteed — this strips a markdown code fence if the
 * model wraps its output in one anyway, then parses.
 */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenceMatch ? fenceMatch[1] : trimmed;
  return JSON.parse(candidate);
}
