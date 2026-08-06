"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { slugify } from "@/lib/ccps/slugify";
import { STAGES } from "@/lib/ccps/constants";
import type { CcpsStage } from "@/lib/supabase/database.types";
import {
  listStageFieldTemplates,
  createStageFieldTemplateRecord,
  updateStageFieldTemplateRecord,
  deleteStageFieldTemplateRecord,
} from "@/lib/db";

export async function createStageFieldTemplate(formData: FormData) {
  await requireAdmin();

  const stage = String(formData.get("stage") ?? "") as CcpsStage;
  const shortName = String(formData.get("shortName") ?? "").trim();
  const fullPrompt = String(formData.get("fullPrompt") ?? "").trim();
  const helperText = String(formData.get("helperText") ?? "").trim();
  if (!stage || !shortName || !fullPrompt) {
    throw new Error("Stage, short name, and full prompt are required.");
  }

  const existing = await listStageFieldTemplates(stage);

  const base = `${stage.toLowerCase()}_${slugify(shortName)}`;
  const existingKeys = new Set(existing.map((f) => f.field_key));
  let fieldKey = base;
  let suffix = 2;
  while (existingKeys.has(fieldKey)) {
    fieldKey = `${base}_${suffix}`;
    suffix += 1;
  }

  const stageNumber = STAGES.findIndex((s) => s.key === stage) + 1;
  const nextSequence =
    existing.reduce((max, f) => {
      const n = Number(f.internal_id.split(".")[1]);
      return Number.isFinite(n) ? Math.max(max, n) : max;
    }, 0) + 1;
  const internalId = `${stageNumber}.${nextSequence}`;

  const nextSortOrder =
    existing.reduce((max, f) => Math.max(max, f.sort_order), 0) + 1;

  await createStageFieldTemplateRecord(
    stage,
    fieldKey,
    internalId,
    shortName,
    fullPrompt,
    helperText || null,
    nextSortOrder
  );
  revalidatePath("/admin/settings/fields");
}

export async function updateStageFieldTemplate(
  id: string,
  shortName: string,
  fullPrompt: string,
  helperText: string,
  sortOrder: number
) {
  await requireAdmin();
  const trimmedShortName = shortName.trim();
  const trimmedFullPrompt = fullPrompt.trim();
  if (!trimmedShortName || !trimmedFullPrompt) {
    throw new Error("Short name and full prompt are required.");
  }

  await updateStageFieldTemplateRecord(id, {
    shortName: trimmedShortName,
    fullPrompt: trimmedFullPrompt,
    helperText: helperText.trim() || null,
    sortOrder,
  });
  revalidatePath("/admin/settings/fields");
}

export async function deleteStageFieldTemplate(id: string) {
  await requireAdmin();
  await deleteStageFieldTemplateRecord(id);
  revalidatePath("/admin/settings/fields");
}
