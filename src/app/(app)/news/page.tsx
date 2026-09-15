import { createClient } from "@/lib/supabase/server";
import { NewsClient } from "./news-client";
import type { KnowledgeLevel } from "@/lib/knowledge";

export default async function NewsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("knowledge_level")
    .eq("id", user.id)
    .maybeSingle();

  const knowledgeLevel: KnowledgeLevel =
    (profile?.knowledge_level as KnowledgeLevel) ?? "intermediate";

  return <NewsClient knowledgeLevel={knowledgeLevel} />;
}
