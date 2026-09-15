import type { KnowledgeLevel } from "@/lib/knowledge";
import type { TranscriptMessage } from "./types";

const SPEAKER_LABELS: Record<string, string> = {
  moderator: "Moderator",
  user: "You",
  aggressor: "Aggressor",
  analyst: "Analyst",
  fence_sitter: "Fence-sitter",
};

function formatTranscript(messages: TranscriptMessage[]): string {
  return messages
    .map((m) => `${SPEAKER_LABELS[m.speaker] ?? m.speaker}: ${m.content}`)
    .join("\n");
}

/** One combined call per round — returns all 3 bot reactions together, critical for the free-tier rate limit. */
export function buildBotTurnPrompt({
  topic,
  transcript,
  knowledgeLevel,
}: {
  topic: string;
  transcript: TranscriptMessage[];
  knowledgeLevel: KnowledgeLevel;
}): string {
  return `You are simulating THREE participants in a live MBA group discussion (GD) on the topic below. Stay fully in character for each. This is a text chat standing in for real spoken GD turns — keep each response to 1-3 sentences, not an essay, and never mention you are an AI.

Topic: "${topic}"

Personalities (stay in character):
- Aggressor: jumps in fast, speaks with total confidence, makes sweeping claims, but is weak on data and sometimes just wrong. Combative, interrupt-y phrasing ("Look, that's not even—" / "Come on, obviously—").
- Analyst: quiet, measured, backs points with data, examples, or a named framework. Doesn't raise their voice, adds substance over volume.
- Fence-sitter: vague and generic, sees "both sides", hedges everything, never commits to a clear position.

${
  transcript.length > 0
    ? `Discussion so far:\n${formatTranscript(transcript)}\n\nReact to the latest turn and keep the discussion moving.`
    : "The discussion hasn't started yet — this is the opening round. React to the topic itself, as if just hearing it announced."
}

The student's knowledge level is ${knowledgeLevel} — pitch the Analyst's data/framework references accordingly (simpler and more explained for beginner, denser and more assumed for aware).

Respond with ONLY valid JSON, no markdown code fences, no commentary, matching EXACTLY this shape:
{
  "aggressor": "string",
  "analyst": "string",
  "fence_sitter": "string"
}`;
}

/** One call at the end of the session — scores only the "You" (user) turns. */
export function buildScorecardPrompt({
  topic,
  transcript,
  userStats,
}: {
  topic: string;
  transcript: TranscriptMessage[];
  userStats: { messageCount: number; firstMessageAtSeconds: number | null };
}): string {
  return `You are a group discussion (GD) evaluator for an MBA entrance aspirant. Below is the transcript of an 8-minute practice GD. Score ONLY the participant labeled "You" — the Moderator, Aggressor, Analyst, and Fence-sitter are simulated practice partners, not the student.

Topic: "${topic}"

Transcript:
${formatTranscript(transcript)}

Additional data: "You" sent ${userStats.messageCount} message(s)${
    userStats.firstMessageAtSeconds != null
      ? `, first spoke at ${userStats.firstMessageAtSeconds}s into the 480s (8-minute) session`
      : ", and never spoke at all"
  }.

Score "You" on these 4 dimensions, each an integer 0-10:
- content: quality and relevance of the points made
- assertiveness: how promptly and confidently they entered and held their ground (use the timing data above)
- data_usage: use of facts, numbers, or concrete examples to back points
- structure: whether points were organized and built a clear line of reasoning, vs. rambling

Also give 3-5 short, specific, actionable feedback lines (one sentence each) — reference actual moments from the transcript where possible, not generic advice.

If "You" never spoke, score content/data_usage/structure very low (0-2), assertiveness 0, and make the feedback entirely about the importance of entering early.

Respond with ONLY valid JSON, no markdown code fences, no commentary, matching EXACTLY this shape:
{
  "scores": { "content": 0, "assertiveness": 0, "data_usage": 0, "structure": 0 },
  "feedback": ["string", "string", "string"]
}`;
}
