"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import {
  listValidationOptions,
  createValidationOptionRecord,
  updateValidationOptionRecord,
  deleteValidationOptionRecord,
} from "@/lib/db";

export async function createValidationOption(formData: FormData) {
  await requireAdmin();

  const label = String(formData.get("label") ?? "").trim();
  if (!label) throw new Error("Label is required.");

  const existing = await listValidationOptions();
  const nextSortOrder = existing.length + 1;

  await createValidationOptionRecord(label, nextSortOrder);
  revalidatePath("/admin/settings/validation-options");
}

export async function updateValidationOption(
  id: string,
  label: string,
  sortOrder: number
) {
  await requireAdmin();
  const trimmed = label.trim();
  if (!trimmed) throw new Error("Label is required.");

  await updateValidationOptionRecord(id, { label: trimmed, sortOrder });
  revalidatePath("/admin/settings/validation-options");
}

export async function deleteValidationOption(id: string) {
  await requireAdmin();
  await deleteValidationOptionRecord(id);
  revalidatePath("/admin/settings/validation-options");
}
