import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "./onboarding-wizard";
import type { KnowledgeLevel } from "@/lib/knowledge";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Proxy already guards this route, but guard again for direct server
  // access (e.g. this file being hit without the proxy having run).
  if (!user) {
    return null;
  }

  const [{ data: profile }, { data: feeds }] = await Promise.all([
    supabase
      .from("profiles")
      .select("knowledge_level, interests")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("feeds")
      .select("id, name, url")
      .eq("user_id", user.id)
      .order("name"),
  ]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <OnboardingWizard
        initialKnowledgeLevel={(profile?.knowledge_level as KnowledgeLevel) ?? null}
        initialInterests={profile?.interests ?? []}
        initialFeeds={feeds ?? []}
      />
    </main>
  );
}
