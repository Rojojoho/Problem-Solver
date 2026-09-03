import "server-only";
import { redirect } from "next/navigation";
import { getCurrentOrg } from "@/lib/db";

export { getCurrentOrg } from "@/lib/db";

/**
 * Resolves the current user's org and redirects non-owners away. This is
 * the one place the school-admin-only Users page needs to call — RLS
 * enforces the same boundary at the database layer for every write, but
 * DEV_MOCK bypasses RLS entirely, so this check is the only enforcement in
 * dev mode (mirrors requireAdmin() in lib/admin.ts).
 */
export async function requireOrgOwner() {
  const org = await getCurrentOrg();
  if (org.role !== "owner") {
    redirect("/plans");
  }
  return org;
}
