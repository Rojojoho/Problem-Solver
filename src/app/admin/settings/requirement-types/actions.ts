"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import {
  listRequirementTypes,
  createRequirementTypeRecord,
  updateRequirementTypeRecord,
  deleteRequirementTypeRecord,
} from "@/lib/db";

export async function createRequirementType(formData: FormData) {
  await requireAdmin();

  const label = String(formData.get("label") ?? "").trim();
  if (!label) throw new Error("Label is required.");

  const existing = await listRequirementTypes();
  const nextSortOrder = existing.length + 1;

  await createRequirementTypeRecord(label, nextSortOrder);
  revalidatePath("/admin/settings/requirement-types");
}

export async function updateRequirementType(
  id: string,
  label: string,
  sortOrder: number
) {
  await requireAdmin();
  const trimmed = label.trim();
  if (!trimmed) throw new Error("Label is required.");

  await updateRequirementTypeRecord(id, { label: trimmed, sortOrder });
  revalidatePath("/admin/settings/requirement-types");
}

export async function deleteRequirementType(id: string) {
  await requireAdmin();
  await deleteRequirementTypeRecord(id);
  revalidatePath("/admin/settings/requirement-types");
}
