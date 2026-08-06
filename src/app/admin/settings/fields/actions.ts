"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { paragraphDoc } from "@/lib/ccps/constants";
import { updateStageFieldRecord } from "@/lib/db";

export async function updateStageField(
  fieldKey: string,
  shortName: string,
  fullPrompt: string,
  helperText: string,
  defaultContentText: string,
  sortOrder: number
) {
  await requireAdmin();
  const trimmedShortName = shortName.trim();
  const trimmedFullPrompt = fullPrompt.trim();
  if (!trimmedShortName || !trimmedFullPrompt) {
    throw new Error("Short name and full prompt are required.");
  }

  const defaultContentLines = defaultContentText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  await updateStageFieldRecord(fieldKey, {
    shortName: trimmedShortName,
    fullPrompt: trimmedFullPrompt,
    helperText: helperText.trim() || null,
    defaultContent: defaultContentLines.length ? paragraphDoc(...defaultContentLines) : null,
    sortOrder,
  });
  revalidatePath("/admin/settings/fields");
}
