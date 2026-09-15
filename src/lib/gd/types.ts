export type BotPersona = "aggressor" | "analyst" | "fence_sitter";
export type Speaker = "moderator" | "user" | BotPersona;

export type TranscriptMessage = {
  id: string;
  speaker: Speaker;
  content: string;
  /** ms since session start — used to compute "entry speed" for scoring. */
  timestamp: number;
};

export type BotTurn = {
  aggressor: string;
  analyst: string;
  fence_sitter: string;
};

export type GDScores = {
  content: number;
  assertiveness: number;
  data_usage: number;
  structure: number;
};

export type GDScorecard = {
  scores: GDScores;
  feedback: string[];
};

export function isBotTurn(value: unknown): value is BotTurn {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.aggressor === "string" &&
    typeof v.analyst === "string" &&
    typeof v.fence_sitter === "string"
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

export function isGDScorecard(value: unknown): value is GDScorecard {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const scores = v.scores as Record<string, unknown> | undefined;
  if (!scores) return false;
  const dims: (keyof GDScores)[] = [
    "content",
    "assertiveness",
    "data_usage",
    "structure",
  ];
  if (!dims.every((d) => typeof scores[d] === "number")) return false;
  return isStringArray(v.feedback);
}
