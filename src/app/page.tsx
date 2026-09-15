import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Proxy (src/proxy.ts) already routes signed-out visitors to /login before
  // this renders; this covers direct server access as a fallback.
  redirect(user ? "/news" : "/login");
}
