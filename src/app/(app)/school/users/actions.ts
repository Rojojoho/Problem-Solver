"use server";

import { revalidatePath } from "next/cache";
import { requireOrgOwner } from "@/lib/org";
import { createInviteRecord, deleteInviteRecord, removeOrgMemberRecord } from "@/lib/db";

export async function inviteUser(input: {
  email: string;
  fullName: string;
  nickname: string;
  role: "owner" | "contributor";
}) {
  const { orgId } = await requireOrgOwner();

  const email = input.email.trim();
  if (!email) throw new Error("Email is required.");

  await createInviteRecord(orgId, {
    email,
    fullName: input.fullName.trim() || null,
    nickname: input.nickname.trim() || null,
    role: input.role,
  });
  revalidatePath("/school/users");
}

export async function cancelInvite(inviteId: string) {
  await requireOrgOwner();
  await deleteInviteRecord(inviteId);
  revalidatePath("/school/users");
}

export async function removeSchoolUser(userId: string) {
  const { orgId } = await requireOrgOwner();
  await removeOrgMemberRecord(orgId, userId);
  revalidatePath("/school/users");
}
