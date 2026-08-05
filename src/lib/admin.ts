import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUserId, isAdmin } from "@/lib/db";

export { isAdmin } from "@/lib/db";

/**
 * Resolves the current user and redirects non-admins away. This is the one
 * place server actions/pages under /admin need to call — RLS enforces the
 * same boundary at the database layer, but DEV_MOCK bypasses RLS entirely,
 * so this check is the only enforcement in dev mode.
 */
export async function requireAdmin(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId || !(await isAdmin(userId))) {
    redirect("/plans");
  }
  return userId;
}
