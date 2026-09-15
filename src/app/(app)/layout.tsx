import { logout } from "@/app/actions/auth";
import { TabNav } from "./tab-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-divider bg-background px-6 py-3">
        <span className="text-sm font-semibold tracking-tight">GDArena</span>
        <TabNav />
        <form action={logout}>
          <button
            type="submit"
            className="text-sm text-muted hover:text-black/80 dark:hover:text-white/80"
          >
            Log out
          </button>
        </form>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
