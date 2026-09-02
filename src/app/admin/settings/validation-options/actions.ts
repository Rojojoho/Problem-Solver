"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { PARKED_VALIDATION_LABEL } from "@/lib/ccps/constants";
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
  const nextSortOrder = Math.max(0, ...existing.map((o) => o.sort_order)) + 1;

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

  const existing = await listValidationOptions();
  const current = existing.find((o) => o.id === id);
  if (current?.label === PARKED_VALIDATION_LABEL && trimmed !== PARKED_VALIDATION_LABEL) {
    throw new Error(
      `"${PARKED_VALIDATION_LABEL}" has special behavior on Stage 2 (strikethrough, excluded from Consolidate) and can't be renamed.`
    );
  }

  await updateValidationOptionRecord(id, { label: trimmed, sortOrder });
  revalidatePath("/admin/settings/validation-options");
}

export async function deleteValidationOption(id: string) {
  await requireAdmin();

  const existing = await listValidationOptions();
  const current = existing.find((o) => o.id === id);
  if (current?.label === PARKED_VALIDATION_LABEL) {
    throw new Error(
      `"${PARKED_VALIDATION_LABEL}" has special behavior on Stage 2 (strikethrough, excluded from Consolidate) and can't be deleted.`
    );
  }

  await deleteValidationOptionRecord(id);
  revalidatePath("/admin/settings/validation-options");
}
