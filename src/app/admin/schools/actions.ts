"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import {
  createSchoolRecord,
  updateSchoolRecord,
  regenerateJoinCodeRecord,
  removeOrgMemberRecord,
  type SchoolCrmInput,
} from "@/lib/db";

function parseSchoolInput(formData: FormData): SchoolCrmInput {
  const str = (key: string) => ((formData.get(key) as string) ?? "").trim() || null;
  const name = ((formData.get("name") as string) ?? "").trim();
  if (!name) throw new Error("School name is required.");

  const yearlyChargeRaw = (formData.get("yearlyCharge") as string) ?? "";

  return {
    name,
    primaryContactName: str("primaryContactName"),
    primaryContactEmail: str("primaryContactEmail"),
    accountsEmail: str("accountsEmail"),
    adminUserCode: str("adminUserCode"),
    subscriptionUntil: str("subscriptionUntil"),
    yearlyCharge: yearlyChargeRaw.trim() ? Number(yearlyChargeRaw) : null,
    salesContact: str("salesContact"),
    notes: str("notes"),
  };
}

export async function createSchool(formData: FormData) {
  await requireAdmin();
  await createSchoolRecord(parseSchoolInput(formData));
  revalidatePath("/admin/schools");
}

export async function updateSchool(orgId: string, formData: FormData) {
  await requireAdmin();
  await updateSchoolRecord(orgId, parseSchoolInput(formData));
  revalidatePath("/admin/schools");
}

export async function regenerateSchoolJoinCode(orgId: string) {
  await requireAdmin();
  const code = await regenerateJoinCodeRecord(orgId);
  revalidatePath("/admin/schools");
  return code;
}

export async function removeSchoolMember(orgId: string, userId: string) {
  await requireAdmin();
  await removeOrgMemberRecord(orgId, userId);
  revalidatePath(`/admin/schools/${orgId}/users`);
}
