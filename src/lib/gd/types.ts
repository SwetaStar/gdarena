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

export type PrepExample = {
  point: string;
  reason: string;
  example: string;
  concluding_point: string;
};

export type PrepCard = {
  opening_line: string;
  prep_example: PrepExample;
  entry_phrases: string[];
  closing_line: string;
};

export type ModelAnswer = {
  /** Verbatim quote of the user's actual (weaker) contribution. */
  original: string;
  /** The same point, rewritten in well-structured Point-Reason-Example-Point form. */
  improved: string;
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
  /** null only if the user never spoke — nothing to rewrite. */
  model_answer: ModelAnswer | null;
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

export function isPrepCard(value: unknown): value is PrepCard {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const example = v.prep_example as Record<string, unknown> | undefined;
  return (
    typeof v.opening_line === "string" &&
    typeof v.closing_line === "string" &&
    isStringArray(v.entry_phrases) &&
    !!example &&
    typeof example.point === "string" &&
    typeof example.reason === "string" &&
    typeof example.example === "string" &&
    typeof example.concluding_point === "string"
  );
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
  if (!isStringArray(v.feedback)) return false;

  const modelAnswer = v.model_answer;
  if (modelAnswer !== null) {
    if (!modelAnswer || typeof modelAnswer !== "object") return false;
    const ma = modelAnswer as Record<string, unknown>;
    if (typeof ma.original !== "string" || typeof ma.improved !== "string") return false;
  }
  return true;
}
