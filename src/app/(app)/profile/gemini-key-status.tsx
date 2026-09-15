"use client";

import Link from "next/link";
import { useStoredGeminiKey } from "@/lib/gemini-key";

export function GeminiKeyStatus() {
  const storedKey = useStoredGeminiKey();
  const hasKey = Boolean(storedKey);

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/15">
      <span>
        Gemini API key —{" "}
        {hasKey ? (
          <span className="text-green-700 dark:text-green-400">connected</span>
        ) : (
          <span className="text-red-600 dark:text-red-400">not set</span>
        )}
      </span>
      <Link href="/onboarding" className="font-medium underline">
        {hasKey ? "Update" : "Add key"}
      </Link>
    </div>
  );
}
