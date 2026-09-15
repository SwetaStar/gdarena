"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateFeedUrl } from "@/lib/feeds/parse";
import type { KnowledgeLevel } from "@/lib/knowledge";

// Return errors instead of throwing them. Next.js redacts thrown Server
// Action error messages in production builds (you get a generic "Minified
// React error #441 ... digest ..." on the client instead) — dev mode never
// shows this, so the gap only surfaces after deploying. Returning a plain
// value sidesteps the redaction entirely.
export type ActionResult = { ok: true } | { ok: false; error: string };

type Auth =
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; userId: string }
  | { ok: false; error: string };

async function requireUserId(): Promise<Auth> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };
  return { ok: true, supabase, userId: user.id };
}

export async function saveKnowledgeLevel(level: KnowledgeLevel): Promise<ActionResult> {
  const auth = await requireUserId();
  if (!auth.ok) return auth;

  const { error } = await auth.supabase
    .from("profiles")
    .update({ knowledge_level: level })
    .eq("id", auth.userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/onboarding");
  return { ok: true };
}

export async function saveInterests(interests: string[]): Promise<ActionResult> {
  const auth = await requireUserId();
  if (!auth.ok) return auth;

  const { error } = await auth.supabase
    .from("profiles")
    .update({ interests })
    .eq("id", auth.userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/onboarding");
  return { ok: true };
}

export async function addFeed(name: string, url: string): Promise<ActionResult> {
  const trimmedName = name.trim();
  const trimmedUrl = url.trim();
  if (!trimmedName || !trimmedUrl) {
    return { ok: false, error: "Name and URL are required." };
  }

  const validation = await validateFeedUrl(trimmedUrl);
  if (!validation.ok) return { ok: false, error: validation.error };

  const auth = await requireUserId();
  if (!auth.ok) return auth;

  const { error } = await auth.supabase
    .from("feeds")
    .insert({ user_id: auth.userId, name: trimmedName, url: trimmedUrl });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/onboarding");
  revalidatePath("/profile");
  return { ok: true };
}

export async function removeFeed(id: string): Promise<ActionResult> {
  const auth = await requireUserId();
  if (!auth.ok) return auth;

  const { error } = await auth.supabase
    .from("feeds")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/onboarding");
  revalidatePath("/profile");
  return { ok: true };
}
