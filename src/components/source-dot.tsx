import { getFeedBrandColor } from "@/lib/feeds/brand-colors";

/**
 * Small colored dot for a news source's verified brand color. Renders
 * nothing for sources without one (most custom/user-added feeds) rather
 * than showing a placeholder — only sources we've actually confirmed a
 * color for get an accent.
 */
export function SourceDot({ url }: { url: string }) {
  const color = getFeedBrandColor(url);
  if (!color) return null;

  return (
    <span
      aria-hidden
      className="inline-block h-2 w-2 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}
