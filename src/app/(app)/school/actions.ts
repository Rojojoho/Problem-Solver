"use server";

import { revalidatePath } from "next/cache";
import { getCurrentOrg } from "@/lib/org";
import { removeOrgMemberRecord } from "@/lib/db";

export async function removeMyOrgMember(userId: string) {
  const { orgId, role } = await getCurrentOrg();
  if (role !== "owner") {
    throw new Error("Only the school's owner can remove members.");
  }
  await removeOrgMemberRecord(orgId, userId);
  revalidatePath("/school/settings");
}
