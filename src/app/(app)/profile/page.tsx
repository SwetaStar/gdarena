import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FeedManager, FeedUrlHelpTooltip } from "@/components/feed-manager";
import { GeminiKeyStatus } from "./gemini-key-status";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: profile }, { data: feeds }] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, knowledge_level, interests")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("feeds")
      .select("id, name, url")
      .eq("user_id", user.id)
      .order("name"),
  ]);

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-12">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold">
            {profile?.first_name} {profile?.last_name}
          </h1>
          <p className="text-sm text-black/50 dark:text-white/50">
            {user.email}
          </p>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-black/50 dark:text-white/50">
              Knowledge level
            </span>
            <span className="capitalize">
              {profile?.knowledge_level ?? "Not set"}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="shrink-0 text-black/50 dark:text-white/50">
              Interests
            </span>
            <span className="text-right">
              {profile?.interests?.length ? profile.interests.join(", ") : "Not set"}
            </span>
          </div>
        </div>

        <GeminiKeyStatus />

        <div className="flex flex-col gap-2">
          <h2 className="flex items-center gap-1.5 text-sm font-medium text-black/50 dark:text-white/50">
            News sources <FeedUrlHelpTooltip />
          </h2>
          <FeedManager initialFeeds={feeds ?? []} />
        </div>

        <Link
          href="/onboarding"
          className="text-center text-sm font-medium underline"
        >
          Redo onboarding
        </Link>
      </div>
    </main>
  );
}
