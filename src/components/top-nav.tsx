import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import { DEV_MOCK } from "@/lib/dev-mode";

export async function TopNav() {
  const email = DEV_MOCK ? null : await getUserEmail();

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/plans" className="font-semibold">
            Complex Problem Solver
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/plans" className="hover:text-foreground">
              Plans
            </Link>
          </nav>
        </div>
        {DEV_MOCK ? (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            Dev mock mode — nothing is saved permanently
          </span>
        ) : (
          email && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
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
