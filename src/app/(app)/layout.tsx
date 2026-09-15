import { logout } from "@/app/actions/auth";
import { TabNav } from "./tab-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-black/10 px-6 py-3 dark:border-white/15">
        <span className="text-sm font-semibold tracking-tight">GDArena</span>
        <TabNav />
        <form action={logout}>
          <button
            type="submit"
            className="text-sm text-black/50 hover:text-black/80 dark:text-white/50 dark:hover:text-white/80"
          >
            Log out
          </button>
        </form>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
