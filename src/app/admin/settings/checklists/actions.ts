"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { slugify } from "@/lib/ccps/slugify";
import type { CcpsStage } from "@/lib/supabase/database.types";
import {
  listChecklistTemplateItems,
  createChecklistTemplateItemRecord,
  updateChecklistTemplateItemRecord,
  deleteChecklistTemplateItemRecord,
} from "@/lib/db";

export async function createChecklistTemplateItem(formData: FormData) {
  await requireAdmin();

  const stage = String(formData.get("stage") ?? "") as CcpsStage;
  const label = String(formData.get("label") ?? "").trim();
  if (!stage || !label) throw new Error("Stage and label are required.");

  const existing = await listChecklistTemplateItems(stage);
  const existingKeys = new Set(existing.map((i) => i.item_key));
  const base = `${stage.toLowerCase()}_${slugify(label)}`;
  let itemKey = base;
  let suffix = 2;
  while (existingKeys.has(itemKey)) {
    itemKey = `${base}_${suffix}`;
    suffix += 1;
  }

  const nextSortOrder =
    existing.reduce((max, i) => Math.max(max, i.sort_order), 0) + 1;

  await createChecklistTemplateItemRecord(stage, itemKey, label, nextSortOrder);
  revalidatePath("/admin/settings/checklists");
}

export async function updateChecklistTemplateItem(
  id: string,
  label: string,
  sortOrder: number
) {
  await requireAdmin();
  const trimmed = label.trim();
  if (!trimmed) throw new Error("Label is required.");

  await updateChecklistTemplateItemRecord(id, { label: trimmed, sortOrder });
  revalidatePath("/admin/settings/checklists");
}

export async function deleteChecklistTemplateItem(id: string) {
  await requireAdmin();
  await deleteChecklistTemplateItemRecord(id);
  revalidatePath("/admin/settings/checklists");
}
