"use client";

import { useSyncExternalStore } from "react";

// The Gemini key never touches Supabase or app logs — it lives only in the
// browser's localStorage. useSyncExternalStore is the correct way to read
// an external, non-React store like this without a setState-in-effect
// hydration flash.
export const GEMINI_KEY_STORAGE_KEY = "gdarena:gemini_api_key";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot() {
  try {
    return window.localStorage.getItem(GEMINI_KEY_STORAGE_KEY);
  } catch {
    return null;
  }
}

function getServerSnapshot() {
  return null;
}

/** The Gemini key currently in localStorage, or null if unset/unavailable. */
export function useStoredGeminiKey() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function setStoredGeminiKey(key: string) {
  try {
    window.localStorage.setItem(GEMINI_KEY_STORAGE_KEY, key);
  } catch {
    // Non-fatal — the key still works for the rest of this session.
  }
}
