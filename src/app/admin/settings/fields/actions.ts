"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { updateStageFieldRecord } from "@/lib/db";

export async function updateStageField(
  fieldKey: string,
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

  await updateStageFieldRecord(fieldKey, {
    shortName: trimmedShortName,
    fullPrompt: trimmedFullPrompt,
    helperText: helperText.trim() || null,
    sortOrder,
  });
  revalidatePath("/admin/settings/fields");
}
