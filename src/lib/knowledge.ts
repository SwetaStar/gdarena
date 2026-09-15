// Shared constants/types used on both client and server. Kept out of
// src/app/actions/onboarding.ts because a "use server" file may only
// export async functions — a plain const array export breaks that build
// rule the moment a server context (e.g. a Route Handler) imports it.
export const KNOWLEDGE_LEVELS = ["beginner", "intermediate", "aware"] as const;
export type KnowledgeLevel = (typeof KNOWLEDGE_LEVELS)[number];

export const INTERESTS = [
  "Markets",
  "Policy",
  "Geopolitics",
  "Startups",
  "Tech",
  "Energy",
  "Banking",
] as const;
