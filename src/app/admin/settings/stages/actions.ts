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

export async function updateStage(key: string, label: string, sortOrder: number) {
  await requireAdmin();
  const trimmed = label.trim();
  if (!trimmed) throw new Error("Label is required.");

  await updateStageRecord(key, { label: trimmed, sortOrder });
  revalidatePath("/admin/settings/stages");
}

export async function updateWorkspaceTabPosition(
  key: "details" | "summary",
  sortOrder: number
) {
  await requireAdmin();
  await updateWorkspaceTabPositionRecord(key, sortOrder);
  revalidatePath("/admin/settings/stages");
}
