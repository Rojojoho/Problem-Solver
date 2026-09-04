import Link from "next/link";
import Image from "next/image";
import { ListChecks, ShieldCheck, BookOpen, Library, School, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import { DEV_MOCK } from "@/lib/dev-mode";
import { getCurrentUserId, isAdmin, getCurrentOrg } from "@/lib/db";

export async function TopNav() {
  const email = DEV_MOCK ? null : await getUserEmail();
  const userId = await getCurrentUserId();
  const admin = await isAdmin(userId);

  // TopNav only ever renders inside the authenticated (app) layout, so a
  // session always exists here — but guarded anyway (skip entirely if
  // somehow no user, fall back to false on any lookup error) since a
  // missing/broken org shouldn't be able to take down the whole nav bar.
  let isOrgOwner = false;
  if (userId) {
    try {
      const org = await getCurrentOrg();
      isOrgOwner = org.role === "owner";
    } catch {
      isOrgOwner = false;
    }
  }

  return (
    <header className="fixed inset-x-0 top-0 z-40 h-14 border-b border-nav-foreground/10 bg-nav">
      <div className="flex h-14 w-full items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/plans" className="flex items-center gap-2 text-xl font-bold text-white">
            <Image
              src="/assets/Resolve_white_small.png"
              alt=""
              width={200}
              height={87}
              className="h-5 w-auto"
              priority
            />
            Resolve
          </Link>
          <nav className="flex items-center gap-4 text-sm text-white/70">
            <Link href="/plans" className="flex items-center gap-1.5 hover:text-white">
              <ListChecks className="size-4" />
              Plans
            </Link>
            <Link href="/kb" className="flex items-center gap-1.5 hover:text-white">
              <BookOpen className="size-4" />
              Guide
            </Link>
            <Link href="/school/settings" className="flex items-center gap-1.5 hover:text-white">
              <School className="size-4" />
              School
            </Link>
            <Link
              href="/school/knowledge-base"
              className="flex items-center gap-1.5 hover:text-white"
            >
              <Library className="size-4" />
              Knowledge Base
            </Link>
            {isOrgOwner && (
              <Link href="/school/users" className="flex items-center gap-1.5 hover:text-white">
                <Users className="size-4" />
                Users
              </Link>
            )}
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
