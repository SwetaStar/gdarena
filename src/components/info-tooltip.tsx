"use client";

import type { ReactNode } from "react";

/**
 * Small "i" icon that reveals a text panel on hover (and on focus, so it's
 * reachable by keyboard/tap, not just a mouse hover).
 */
export function InfoTooltip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={label}
        className="flex h-4 w-4 items-center justify-center rounded-full border border-black/25 text-[10px] leading-none text-black/50 dark:border-white/30 dark:text-white/50"
      >
        i
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-64 -translate-x-1/2 rounded-md border border-black/10 bg-background p-3 text-left text-xs font-normal leading-relaxed text-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 dark:border-white/15"
      >
        {children}
      </span>
    </span>
  );
}
