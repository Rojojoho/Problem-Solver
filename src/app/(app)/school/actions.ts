"use server";

import { revalidatePath } from "next/cache";
import { getCurrentOrg } from "@/lib/org";
import {
  regenerateJoinCodeRecord,
  removeOrgMemberRecord,
  joinOrgByCodeRecord,
} from "@/lib/db";

export async function regenerateMyJoinCode() {
  const { orgId } = await getCurrentOrg();
  const code = await regenerateJoinCodeRecord(orgId);
  revalidatePath("/school/settings");
  return code;
}

export async function removeMyOrgMember(userId: string) {
  const { orgId, role } = await getCurrentOrg();
  if (role !== "owner") {
    throw new Error("Only the school's owner can remove members.");
  }
  await removeOrgMemberRecord(orgId, userId);
  revalidatePath("/school/settings");
}

export async function joinSchool(formData: FormData) {
  const code = ((formData.get("code") as string) ?? "").trim();
  if (!code) throw new Error("Enter a join code.");
  await joinOrgByCodeRecord(code);
  revalidatePath("/school/settings");
  revalidatePath("/plans");
}
