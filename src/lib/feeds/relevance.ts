// Official government/regulator press releases are relevant to GD prep by
// definition — skip the LLM entirely for these (saves quota, and avoids
// any risk of the model second-guessing an official rate/policy release).
const ALWAYS_RELEVANT = [/rbi\.org\.in/i, /sebi\.gov\.in/i, /pib\.gov\.in/i];

export function isAlwaysRelevant(url: string): boolean {
  return ALWAYS_RELEVANT.some((pattern) => pattern.test(url));
}

export type RelevanceCandidate = { index: number; title: string; snippet: string };

export function buildRelevancePrompt(candidates: RelevanceCandidate[]): string {
  const list = candidates
    .map((c) => `${c.index}. ${c.title}${c.snippet ? ` — ${c.snippet.slice(0, 200)}` : ""}`)
    .join("\n");

  return `You are filtering a news feed for an MBA entrance exam group-discussion (GD) prep app. For each numbered article below, decide whether it's genuinely useful for building GD / current-affairs knowledge: business, economy, markets, policy, regulation, corporate strategy, geopolitics, or technology as a business/policy story.

Mark as NOT relevant: crime and accident reports, celebrity or entertainment-industry gossip, sports scores/results, lifestyle listicles, local human-interest stories with no business/policy angle, obituaries, viral/social-media stories with no substantive angle.

Articles:
${list}

Respond with ONLY valid JSON, no markdown code fences, no commentary, matching EXACTLY this shape:
{"relevant": [1, 3, 5]}

The array lists the NUMBERS of articles that ARE relevant — omit the rest. If none are relevant, return an empty array.`;
}

export function isRelevanceResult(value: unknown): value is { relevant: number[] } {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.relevant) && v.relevant.every((n) => typeof n === "number");
}
