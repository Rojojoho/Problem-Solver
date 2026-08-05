import Link from "next/link";
import { Compass, ListChecks, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import { DEV_MOCK } from "@/lib/dev-mode";
import { getCurrentUserId, isAdmin } from "@/lib/db";

export async function TopNav() {
  const email = DEV_MOCK ? null : await getUserEmail();
  const userId = await getCurrentUserId();
  const admin = await isAdmin(userId);

  return (
    <header className="fixed inset-x-0 top-0 z-40 h-14 border-b border-nav-foreground/10 bg-nav">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/plans" className="flex items-center gap-2 font-bold text-white">
            <Compass className="size-5" />
            Complex Problem Solver
          </Link>
          <nav className="flex items-center gap-4 text-sm text-white/70">
            <Link href="/plans" className="flex items-center gap-1.5 hover:text-white">
              <ListChecks className="size-4" />
              Plans
            </Link>
            {admin && (
              <Link href="/admin" className="flex items-center gap-1.5 hover:text-white">
                <ShieldCheck className="size-4" />
                Admin
              </Link>
            )}
          </nav>
        </div>
        {DEV_MOCK ? (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            Dev mock mode — nothing is saved permanently
          </span>
        ) : (
          email && (
            <div className="flex items-center gap-3 text-sm text-white/70">
              <span>{email}</span>
              <SignOutButton />
            </div>
          )
        )}
      </div>
    </header>
  );
}

async function getUserEmail() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email ?? null;
}
