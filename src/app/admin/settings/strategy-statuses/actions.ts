"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import {
  listSolutionStrategyStatuses,
  createSolutionStrategyStatusRecord,
  updateSolutionStrategyStatusRecord,
  deleteSolutionStrategyStatusRecord,
} from "@/lib/db";

export async function createStrategyStatus(formData: FormData) {
  await requireAdmin();

  const label = String(formData.get("label") ?? "").trim();
  if (!label) throw new Error("Label is required.");

  const existing = await listSolutionStrategyStatuses();
  const nextSortOrder = existing.length + 1;

  await createSolutionStrategyStatusRecord(label, nextSortOrder);
  revalidatePath("/admin/settings/strategy-statuses");
}

export async function updateStrategyStatus(
  id: string,
  label: string,
  sortOrder: number
) {
  await requireAdmin();
  const trimmed = label.trim();
  if (!trimmed) throw new Error("Label is required.");

  await updateSolutionStrategyStatusRecord(id, { label: trimmed, sortOrder });
  revalidatePath("/admin/settings/strategy-statuses");
}

export async function deleteStrategyStatus(id: string) {
  await requireAdmin();
  await deleteSolutionStrategyStatusRecord(id);
  revalidatePath("/admin/settings/strategy-statuses");
}
