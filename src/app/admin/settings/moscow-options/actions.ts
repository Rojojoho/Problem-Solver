"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import {
  listMoscowOptions,
  createMoscowOptionRecord,
  updateMoscowOptionRecord,
  deleteMoscowOptionRecord,
} from "@/lib/db";

export async function createMoscowOption(formData: FormData) {
  await requireAdmin();

  const label = String(formData.get("label") ?? "").trim();
  if (!label) throw new Error("Label is required.");

  const existing = await listMoscowOptions();
  const nextSortOrder = existing.length + 1;

  await createMoscowOptionRecord(label, nextSortOrder);
  revalidatePath("/admin/settings/moscow-options");
}

export async function updateMoscowOption(
  id: string,
  label: string,
  sortOrder: number
) {
  await requireAdmin();
  const trimmed = label.trim();
  if (!trimmed) throw new Error("Label is required.");

  await updateMoscowOptionRecord(id, { label: trimmed, sortOrder });
  revalidatePath("/admin/settings/moscow-options");
}

export async function deleteMoscowOption(id: string) {
  await requireAdmin();
  await deleteMoscowOptionRecord(id);
  revalidatePath("/admin/settings/moscow-options");
}
