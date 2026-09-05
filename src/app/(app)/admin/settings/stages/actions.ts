"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { slugify } from "@/lib/ccps/slugify";
import {
  listStages,
  createStageRecord,
  updateStageRecord,
  updateWorkspaceTabPositionRecord,
} from "@/lib/db";

export async function createStage(formData: FormData) {
  await requireAdmin();

  const label = String(formData.get("label") ?? "").trim();
  if (!label) throw new Error("Label is required.");

  const existing = await listStages();
  const existingKeys = new Set(existing.map((s) => s.key.toLowerCase()));
  const base = slugify(label).toUpperCase() || "STAGE";
  let key = base;
  let suffix = 2;
  while (existingKeys.has(key.toLowerCase())) {
    key = `${base}_${suffix}`;
    suffix += 1;
  }

  const nextSortOrder = existing.reduce((max, s) => Math.max(max, s.sort_order), 0) + 1;

  await createStageRecord(key, label, nextSortOrder);
  revalidatePath("/admin/settings/stages");
}

export async function updateStage(
  key: string,
  updates: { label: string; fullName: string; description: string; sortOrder: number }
) {
  await requireAdmin();
  const label = updates.label.trim();
  if (!label) throw new Error("Tab name is required.");

  await updateStageRecord(key, {
    label,
    fullName: updates.fullName.trim(),
    description: updates.description.trim(),
    sortOrder: updates.sortOrder,
  });
  revalidatePath("/admin/settings/stages");
}

export async function updateWorkspaceTabPosition(
  key: "details" | "summary",
  updates: { label: string; fullName: string; description: string; sortOrder: number }
) {
  await requireAdmin();
  const label = updates.label.trim();
  if (!label) throw new Error("Tab name is required.");

  await updateWorkspaceTabPositionRecord(key, {
    label,
    fullName: updates.fullName.trim(),
    description: updates.description.trim(),
    sortOrder: updates.sortOrder,
  });
  revalidatePath("/admin/settings/stages");
}
