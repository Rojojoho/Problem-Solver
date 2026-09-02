"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import {
  listImpactMeasureTypes,
  createImpactMeasureTypeRecord,
  updateImpactMeasureTypeRecord,
  deleteImpactMeasureTypeRecord,
} from "@/lib/db";

export async function createImpactMeasureType(formData: FormData) {
  await requireAdmin();

  const label = String(formData.get("label") ?? "").trim();
  if (!label) throw new Error("Label is required.");

  const existing = await listImpactMeasureTypes();
  const nextSortOrder = Math.max(0, ...existing.map((o) => o.sort_order)) + 1;

  await createImpactMeasureTypeRecord(label, nextSortOrder);
  revalidatePath("/admin/settings/impact-measure-types");
}

export async function updateImpactMeasureType(
  id: string,
  label: string,
  sortOrder: number
) {
  await requireAdmin();
  const trimmed = label.trim();
  if (!trimmed) throw new Error("Label is required.");

  await updateImpactMeasureTypeRecord(id, { label: trimmed, sortOrder });
  revalidatePath("/admin/settings/impact-measure-types");
}

export async function deleteImpactMeasureType(id: string) {
  await requireAdmin();
  await deleteImpactMeasureTypeRecord(id);
  revalidatePath("/admin/settings/impact-measure-types");
}
