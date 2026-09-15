import type { KnowledgeLevel } from "@/lib/knowledge";

const LEVEL_GUIDANCE: Record<KnowledgeLevel, string> = {
  beginner:
    "The reader is a beginner: use simple, everyday language throughout, explain any business/finance/policy jargon inline, and list 3-5 key_terms with plain-English meanings.",
  intermediate:
    "The reader has intermediate knowledge: use normal business-news language, only explain genuinely technical terms, and list 1-3 key_terms.",
  aware:
    "The reader is already market-aware: use tighter, analytical prose and assume standard business/economics vocabulary — only list a key_term if it's genuinely obscure (0-2 key_terms), and keep prose dense rather than padded.",
};

const MAX_ARTICLE_CHARS = 12_000;

export function truncateArticleText(text: string): string {
  const trimmed = text.trim();
  return trimmed.length > MAX_ARTICLE_CHARS
    ? trimmed.slice(0, MAX_ARTICLE_CHARS) + " …[truncated]"
    : trimmed;
}

export function buildBriefPrompt({
  title,
  text,
  knowledgeLevel,
}: {
  title: string;
  text: string;
  knowledgeLevel: KnowledgeLevel;
}): string {
  return `You are a group discussion (GD) prep assistant for MBA entrance aspirants in India. Read the article below and produce a GD-ready brief.

Article title: ${title}

Article text (this may be a short snippet rather than the full article, and may be in Hindi or another language — always write your entire response in English regardless of the source language):
"""
${text}
"""

${LEVEL_GUIDANCE[knowledgeLevel]}

Framework lens: pick the ONE diagnostic framework that best fits this specific story. Use this as a guide, not a rigid rule:
- Market share loss / competitive pressure -> Porter's Five Forces or the 3C framework
- Cash flow, debt, or liquidity issues -> Working Capital Cycle or DuPont analysis
- Failed expansion or new market entry -> Ansoff Matrix
- Regulatory or policy action on a company/sector -> PESTEL
- Macroeconomic or monetary policy news -> the most relevant macro framework (e.g. demand-supply, Impossible Trinity) or PESTEL
- Geopolitical story -> game theory or PESTEL
If nothing fits (e.g. the article is too thin to analyze), return name and why as empty strings.
Give ONLY the starting hint for how to apply the framework to this story in 1-2 sentences — do NOT perform the full analysis yourself. The user applies it themselves in discussion.

Content rules:
- arguments_for and arguments_against must have EXACTLY 3 items each.
- data_points must have EXACTLY 2 items, each a concrete number or fact drawn from the article (or clearly marked as approximate/illustrative if the article has no numbers).
- Keep every string concise — this is discussion prep, not an essay.

Respond with ONLY valid JSON, no markdown code fences, no commentary before or after, matching EXACTLY this shape:
{
  "plain": {
    "what_happened": "string",
    "why_it_matters": "string",
    "key_terms": [{"term": "string", "meaning": "string"}]
  },
  "mba": {
    "what_happened": "string",
    "why_it_matters": "string",
    "arguments_for": ["string", "string", "string"],
    "arguments_against": ["string", "string", "string"],
    "data_points": ["string", "string"],
    "framework_lens": {"name": "string", "why": "string"}
  }
}`;
}

export function buildChatPrompt({
  title,
  text,
  knowledgeLevel,
  history,
  question,
}: {
  title: string;
  text: string;
  knowledgeLevel: KnowledgeLevel;
  history: { role: "user" | "assistant"; content: string }[];
  question: string;
}): string {
  const levelNote =
    knowledgeLevel === "beginner"
      ? "Explain in simple terms, as you would to someone new to business news."
      : knowledgeLevel === "aware"
        ? "You can be concise and assume business/economics vocabulary."
        : "Use plain business-news language.";

  const historyBlock = history
    .map((m) => `${m.role === "user" ? "Student" : "You"}: ${m.content}`)
    .join("\n");

  return `You are helping an MBA aspirant understand a news article, in a short back-and-forth chat. Answer only the student's latest question, using the article as context. ${levelNote} Keep answers to a few sentences — this is a chat, not an essay.

Article title: ${title}
Article text:
"""
${text}
"""
${historyBlock ? `\nConversation so far:\n${historyBlock}\n` : ""}
Student: ${question}
You:`;
}
