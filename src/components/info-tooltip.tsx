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
        className="-m-1.5 flex items-center justify-center rounded-full border border-black/25 p-1.5 text-[10px] leading-none text-muted dark:border-white/30"
      >
        <span className="flex h-3.5 w-3.5 items-center justify-center">i</span>
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-64 -translate-x-1/2 rounded-md border border-divider bg-background p-3 text-left text-xs font-normal leading-relaxed text-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {children}
      </span>
    </span>
  );
}
