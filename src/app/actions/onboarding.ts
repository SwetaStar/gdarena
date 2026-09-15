"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateFeedUrl } from "@/lib/feeds/parse";
import type { KnowledgeLevel } from "@/lib/knowledge";

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  return { supabase, userId: user.id };
}

export async function saveKnowledgeLevel(level: KnowledgeLevel) {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase
    .from("profiles")
    .update({ knowledge_level: level })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/onboarding");
}

export async function saveInterests(interests: string[]) {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase
    .from("profiles")
    .update({ interests })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/onboarding");
}

export async function addFeed(name: string, url: string) {
  const trimmedName = name.trim();
  const trimmedUrl = url.trim();
  if (!trimmedName || !trimmedUrl) throw new Error("Name and URL are required.");

  const validation = await validateFeedUrl(trimmedUrl);
  if (!validation.ok) throw new Error(validation.error);

  const { supabase, userId } = await requireUserId();
  const { error } = await supabase
    .from("feeds")
    .insert({ user_id: userId, name: trimmedName, url: trimmedUrl });
  if (error) throw new Error(error.message);
  revalidatePath("/onboarding");
  revalidatePath("/profile");
}

export async function removeFeed(id: string) {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase
    .from("feeds")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/onboarding");
  revalidatePath("/profile");
}
