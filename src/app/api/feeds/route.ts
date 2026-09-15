import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFeedCached } from "@/lib/feeds/parse";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data: feeds, error } = await supabase
    .from("feeds")
    .select("id, name, url")
    .eq("user_id", user.id)
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Each feed fetch is independently cached/fault-isolated: one dead feed
  // never fails the others.
  const results = await Promise.all(
    (feeds ?? []).map((feed) => getFeedCached(feed.id, feed.name, feed.url))
  );

  return NextResponse.json({ feeds: results });
}
